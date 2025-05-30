use derive_more::{Display, From};
use serde::{Serialize, ser::SerializeStruct};
use std::backtrace::Backtrace;

pub type Result<T, E = Error> = std::result::Result<T, E>;

#[derive(Debug, Display)]
#[display("{kind}")]
pub struct Error {
    kind: ErrorKind,
    backtrace: Backtrace,
}

impl std::error::Error for Error {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        self.kind.source()
    }
}

impl Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        let mut s = serializer.serialize_struct("Error", 2)?;
        s.serialize_field("message", &self.kind)?;
        s.end()
    }
}

impl Error {
    fn new(kind: ErrorKind) -> Self {
        Error {
            kind,
            backtrace: Backtrace::capture(),
        }
    }

    pub fn backtrace(&self) -> &Backtrace {
        &self.backtrace
    }

    // Helper methods for accessing specific error types

    pub fn as_tauri_error(&self) -> Option<&tauri::Error> {
        match &self.kind {
            ErrorKind::Tauri(e) => Some(e),
            _ => None,
        }
    }

    pub fn window_not_found(name: impl Into<String>) -> Self {
        Error::new(ErrorKind::WindowNotFound(name.into()))
    }
}

#[derive(Debug, Display, From)]
#[non_exhaustive]
enum ErrorKind {
    #[display("Tauri error: {_0}")]
    Tauri(tauri::Error),

    #[display("Error: {_0}")]
    Other(Box<dyn std::error::Error + Send + Sync>),

    #[display("Window not found: {_0}")]
    WindowNotFound(String),
}

impl Serialize for ErrorKind {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.collect_str(&self)
    }
}

impl std::error::Error for ErrorKind {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            ErrorKind::Tauri(e) => Some(e),
            ErrorKind::Other(e) => Some(e.as_ref()),
            ErrorKind::WindowNotFound(_) => None,
        }
    }
}

// Macro to reduce boilerplate for From implementations
macro_rules! impl_from_error {
    ($($err_type:ty),+ $(,)?) => {
        $(
            impl From<$err_type> for Error {
                fn from(err: $err_type) -> Self {
                    Error::new(ErrorKind::from(err))
                }
            }
        )+
    };
}

impl_from_error!(tauri::Error, Box<dyn std::error::Error + Send + Sync>,);

#[cfg(test)]
mod tests {
    use super::*;
    use serde_test::{Token, assert_ser_tokens};
    use std::error::Error as StdError;

    #[test]
    fn test_error_kind_serialization() {
        let kind = ErrorKind::WindowNotFound("floating".to_string());

        // ErrorKind serializes as a string
        assert_ser_tokens(&kind, &[Token::Str("Window not found: floating")]);
    }

    #[test]
    fn test_error_serialization() {
        let error = Error::window_not_found("test-window");

        // Error serializes as a struct with a "message" field
        assert_ser_tokens(
            &error,
            &[
                Token::Struct {
                    name: "Error",
                    len: 2,
                },
                Token::Str("message"),
                Token::Str("Window not found: test-window"),
                Token::StructEnd,
            ],
        );
    }

    #[test]
    fn test_different_error_kinds() {
        // Test WindowNotFound
        let error1 = Error::window_not_found("floating");
        assert_ser_tokens(
            &error1,
            &[
                Token::Struct {
                    name: "Error",
                    len: 2,
                },
                Token::Str("message"),
                Token::Str("Window not found: floating"),
                Token::StructEnd,
            ],
        );

        // Test Tauri error
        let tauri_err = tauri::Error::WindowNotFound;
        let error2 = Error::from(tauri_err);
        assert_ser_tokens(
            &error2,
            &[
                Token::Struct {
                    name: "Error",
                    len: 2,
                },
                Token::Str("message"),
                Token::Str("Tauri error: window not found"),
                Token::StructEnd,
            ],
        );
    }

    #[test]
    fn test_error_display() {
        let error = Error::window_not_found("main");
        assert_eq!(error.to_string(), "Window not found: main");
    }

    #[test]
    fn test_error_source() {
        let error = Error::window_not_found("test");
        assert!(error.source().is_none());

        // Test with Tauri error that has a source
        let tauri_err = tauri::Error::WindowNotFound;
        let error = Error::from(tauri_err);
        assert!(error.source().is_some());
    }

    #[test]
    fn test_backtrace_not_serialized() {
        // Ensure backtrace is skipped in serialization
        let error = Error::window_not_found("test");
        let json = serde_json::to_value(&error).unwrap();
        assert!(
            json.get("backtrace").is_none(),
            "Backtrace should not be serialized"
        );
    }
}
