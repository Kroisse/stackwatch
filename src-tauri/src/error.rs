use derive_more::{Display, From};
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
}

#[derive(Debug, Display, From)]
#[non_exhaustive]
enum ErrorKind {
    #[display("Tauri error: {_0}")]
    Tauri(tauri::Error),

    #[display("Error: {_0}")]
    Other(Box<dyn std::error::Error + Send + Sync>),
}

impl std::error::Error for ErrorKind {
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        match self {
            ErrorKind::Tauri(e) => Some(e),
            ErrorKind::Other(e) => Some(e.as_ref()),
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

impl_from_error!(
    tauri::Error,
    Box<dyn std::error::Error + Send + Sync>,
);
