//! End-to-end tests for `emosh -k`, running the real binary without a clipboard or tty.

use std::process::{Command, Output};

fn emosh(args: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_emosh"))
        .args(args)
        .output()
        .expect("failed to run emosh")
}

fn stdout(args: &[&str]) -> String {
    let output = emosh(args);
    assert!(output.status.success(), "emosh {args:?} failed: {output:?}");
    String::from_utf8(output.stdout).unwrap()
}

#[test]
fn test_kaomoji_exact_name_wins() {
    let out = stdout(&["-k", "shrug", "-n"]);
    assert!(out.starts_with("¯\\_(ツ)_/¯"), "{out}");
}

#[test]
fn test_kaomoji_multi_word_query_needs_no_quotes() {
    let out = stdout(&["-k", "table", "flip", "-n"]);
    assert!(out.starts_with("(╯°□°)╯︵ ┻━┻"), "{out}");
}

#[test]
fn test_kaomoji_long_flag_and_limit() {
    let out = stdout(&["--kaomoji", "happy", "--no-copy", "--limit", "3"]);
    assert_eq!(out.lines().count(), 3);
}

#[test]
fn test_kaomoji_default_limit_is_seven() {
    assert_eq!(stdout(&["-k", "happy", "-n"]).lines().count(), 7);
}

#[test]
fn test_kaomoji_random_prints_one_face() {
    assert_eq!(stdout(&["-k", "random", "-n"]).lines().count(), 1);
}

#[test]
fn test_kaomoji_treats_honour_clean_and_user() {
    let signed = stdout(&["-k", "treats", "-n", "-u", "sig"]);
    assert!(signed.starts_with('\u{200B}'));
    assert!(signed.contains("a treat from sig"));

    let clean = stdout(&["-k", "treats", "-n", "-c"]);
    assert!(clean.starts_with('\u{200B}'));
    assert!(!clean.contains("a treat from"));
}

#[test]
fn test_kaomoji_no_match_is_reported_not_an_error() {
    assert_eq!(
        stdout(&["-k", "zzzzqqqq", "-n"]),
        "No kaomoji found for 'zzzzqqqq'\n"
    );
}

#[test]
fn test_plain_query_stays_emoji_only() {
    let out = stdout(&["grin", "-n"]);
    assert_eq!(out.trim(), "😁");
}

#[test]
fn test_latex_subcommand_still_works() {
    assert_eq!(stdout(&["latex", "x^2", "-n"]).trim(), "x²");
}
