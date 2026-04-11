use criterion::{black_box, criterion_group, criterion_main, Criterion};
use emosh::emoji::data::EMOJIS;
use emosh::emoji::search::search;

fn bench_search(c: &mut Criterion) {
    c.bench_function("search_exact_keyword", |b| {
        b.iter(|| search(black_box("unicorn"), &EMOJIS, 7))
    });

    c.bench_function("search_fuzzy", |b| {
        b.iter(|| search(black_box("unic"), &EMOJIS, 7))
    });

    c.bench_function("search_treats", |b| {
        b.iter(|| search(black_box("treats"), &EMOJIS, 7))
    });
}

criterion_group!(benches, bench_search);
criterion_main!(benches);
