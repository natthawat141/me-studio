# Project directory settings

Implemented a Project menu action opening source/output settings. Directory changes use the native picker; renderer sends only Project ID, never a raw filesystem path. Main validates sender and Project identity, resolves selected directories and persists the registry atomically. Existing registries default output to source/output without creating it. Source updates affect the active Files root; output is configuration for a future generator and does not grant arbitrary execution or writes.

Project action buttons are 23px with subdued hover. Info separators and desktop keyboard focus use thin neutral gray lines in both themes.

Validation: lint, production build, 52 unit tests and 4 relevant browser flows passed. Browser fixtures cover selecting source/output and closing settings. Native packaging and actual picker inspection are separate from these results.
