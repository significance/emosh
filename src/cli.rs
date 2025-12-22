use clap::Parser;

/// Find relevant emoji from text on the command-line
#[derive(Parser, Debug)]
#[command(
    name = "emosh",
    version,
    about = "Find relevant emoji from text on the command-line",
    long_about = "emosh is a blazing-fast emoji finder. \
                  Run without arguments for interactive mode, \
                  or provide a query for direct search."
)]
pub struct Cli {
    /// Search query (if provided, runs in CLI mode; otherwise launches interactive TUI)
    pub query: Option<String>,

    /// Copy the first result to clipboard
    #[arg(short, long)]
    pub copy: bool,

    /// Skin tone (0-5): 0=default, 1=light, 2=medium-light, 3=medium, 4=medium-dark, 5=dark
    #[arg(short, long, value_parser = clap::value_parser!(u8).range(0..=5))]
    pub skin_tone: Option<u8>,

    /// Maximum number of results to display
    #[arg(short, long, default_value = "7")]
    pub limit: usize,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cli_with_query() {
        let cli = Cli::parse_from(["emosh", "unicorn"]);
        assert_eq!(cli.query, Some("unicorn".to_string()));
        assert!(!cli.copy);
        assert_eq!(cli.skin_tone, None);
        assert_eq!(cli.limit, 7);
    }

    #[test]
    fn test_cli_with_flags() {
        let cli = Cli::parse_from(["emosh", "unicorn", "--copy", "--skin-tone", "3", "--limit", "10"]);
        assert_eq!(cli.query, Some("unicorn".to_string()));
        assert!(cli.copy);
        assert_eq!(cli.skin_tone, Some(3));
        assert_eq!(cli.limit, 10);
    }

    #[test]
    fn test_cli_without_query() {
        let cli = Cli::parse_from(["emosh"]);
        assert_eq!(cli.query, None);
    }
}
