//! A source-agnostic list of items with one selected entry.
//!
//! The picker knows nothing about emoji or kaomoji: it only holds items and moves a
//! selection over them. How items look is decided by the layout strategy in `render`.

/// A list of items with a selection that always stays in range.
#[derive(Debug, Clone, PartialEq)]
pub struct Picker<T> {
    items: Vec<T>,
    selected: usize,
}

impl<T> Default for Picker<T> {
    fn default() -> Self {
        Self {
            items: Vec::new(),
            selected: 0,
        }
    }
}

impl<T> Picker<T> {
    /// An empty picker.
    pub fn new() -> Self {
        Self::default()
    }

    /// All items, best first.
    pub fn items(&self) -> &[T] {
        &self.items
    }

    /// Number of items.
    pub fn len(&self) -> usize {
        self.items.len()
    }

    /// Whether there is nothing to pick.
    pub fn is_empty(&self) -> bool {
        self.items.is_empty()
    }

    /// Zero-based index of the selected item.
    pub fn selected_index(&self) -> usize {
        self.selected
    }

    /// The selected item, if any.
    pub fn selected(&self) -> Option<&T> {
        self.items.get(self.selected)
    }

    /// Replace the items, keeping the selection where it was if still in range
    /// (otherwise clamped to the last item).
    pub fn set_items(&mut self, items: Vec<T>) {
        self.items = items;
        self.selected = self.selected.min(self.items.len().saturating_sub(1));
    }

    /// Replace the items and select the first one.
    pub fn reset_items(&mut self, items: Vec<T>) {
        self.items = items;
        self.selected = 0;
    }

    /// Move the selection one item back (stops at the first).
    pub fn select_previous(&mut self) {
        self.selected = self.selected.saturating_sub(1);
    }

    /// Move the selection one item forward (stops at the last).
    pub fn select_next(&mut self) {
        if self.selected + 1 < self.items.len() {
            self.selected += 1;
        }
    }

    /// Select by one-based number; out-of-range numbers (including 0) are ignored.
    pub fn select_number(&mut self, number: usize) {
        if number > 0 && number <= self.items.len() {
            self.selected = number - 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn picker(n: usize) -> Picker<usize> {
        let mut p = Picker::new();
        p.reset_items((0..n).collect());
        p
    }

    #[test]
    fn test_new_picker_is_empty_with_no_selection() {
        let p: Picker<u8> = Picker::new();
        assert!(p.is_empty());
        assert_eq!(p.len(), 0);
        assert_eq!(p.selected(), None);
        assert_eq!(p.selected_index(), 0);
    }

    #[test]
    fn test_navigation_stops_at_both_ends() {
        let mut p = picker(3);
        p.select_previous();
        assert_eq!(p.selected_index(), 0);
        p.select_next();
        p.select_next();
        p.select_next();
        assert_eq!(p.selected_index(), 2);
        assert_eq!(p.selected(), Some(&2));
        p.select_previous();
        assert_eq!(p.selected_index(), 1);
    }

    #[test]
    fn test_navigation_on_empty_picker_is_safe() {
        let mut p: Picker<u8> = Picker::new();
        p.select_next();
        p.select_previous();
        assert_eq!(p.selected_index(), 0);
    }

    #[test]
    fn test_select_number_is_one_based_and_ignores_out_of_range() {
        let mut p = picker(3);
        p.select_number(2);
        assert_eq!(p.selected_index(), 1);
        p.select_number(4);
        p.select_number(0);
        assert_eq!(p.selected_index(), 1);
    }

    #[test]
    fn test_set_items_keeps_selection_when_in_range_and_clamps_otherwise() {
        let mut p = picker(5);
        p.select_number(4);
        p.set_items(vec![10, 11, 12, 13, 14]);
        assert_eq!(p.selected_index(), 3);
        p.set_items(vec![10, 11]);
        assert_eq!(p.selected_index(), 1);
        p.set_items(vec![]);
        assert_eq!(p.selected_index(), 0);
        assert_eq!(p.items().len(), 0);
    }

    #[test]
    fn test_reset_items_selects_first() {
        let mut p = picker(5);
        p.select_number(4);
        p.reset_items(vec![1, 2]);
        assert_eq!(p.selected_index(), 0);
    }
}
