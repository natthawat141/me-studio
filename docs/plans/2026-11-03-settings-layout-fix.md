# Settings layout correction

Renamed the desktop settings wrapper to chat-settings-layout to stop legacy .settings-layout section/input rules from adding a white top border and distorting controls. Removed negative intro spacing and added a wrapping header with a reserved close-button area. Renamed connection actions to loading AI/voice keys and explicitly states that HTML to MP4 renders locally without a video-generation API key. Dark separators and focus use one-pixel low-contrast neutral gray.

Build passed. Seven related UI tests passed, including checking no inherited top border and no overlap between the connection action and introductory copy. Inspected the dark provider-settings screenshot. Native build update follows these checks.
