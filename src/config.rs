use anyhow::{Context, Result};
use directories::ProjectDirs;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

/// User configuration
#[derive(Debug, Serialize, Deserialize, Clone)]
#[derive(Default)]
pub struct Config {
    /// Default skin tone (0-5)
    pub skin_tone: u8,
}


/// Get the path to the config file
fn config_path() -> Result<PathBuf> {
    let project_dirs = ProjectDirs::from("com", "emosh", "emosh")
        .context("Failed to determine config directory")?;

    let config_dir = project_dirs.config_dir();
    fs::create_dir_all(config_dir)?;

    Ok(config_dir.join("config.toml"))
}

/// Load configuration from disk
///
/// Returns the default configuration if the file doesn't exist
pub fn load_config() -> Result<Config> {
    let path = config_path()?;

    if path.exists() {
        let content = fs::read_to_string(&path)
            .with_context(|| format!("Failed to read config from {}", path.display()))?;

        let config: Config = toml::from_str(&content)
            .context("Failed to parse config file")?;

        Ok(config)
    } else {
        Ok(Config::default())
    }
}

/// Save configuration to disk
pub fn save_config(config: &Config) -> Result<()> {
    let path = config_path()?;

    let content = toml::to_string_pretty(config)
        .context("Failed to serialize config")?;

    fs::write(&path, content)
        .with_context(|| format!("Failed to write config to {}", path.display()))?;

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_config() {
        let config = Config::default();
        assert_eq!(config.skin_tone, 0);
    }

    #[test]
    fn test_config_serialization() {
        let config = Config { skin_tone: 3 };
        let toml = toml::to_string(&config).unwrap();
        assert!(toml.contains("skin_tone = 3"));

        let deserialized: Config = toml::from_str(&toml).unwrap();
        assert_eq!(deserialized.skin_tone, 3);
    }

    #[test]
    fn test_load_config_returns_default_if_not_exists() {
        // This test just verifies the function doesn't panic
        // The actual file may or may not exist depending on previous runs
        let result = load_config();
        assert!(result.is_ok());
    }
}
