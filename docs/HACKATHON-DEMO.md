# Hackathon demo guide

Use the Mac app with an existing project folder and a configured, working model. The app uses an AI model to plan and write HTML animation; HTML capture and MP4 rendering run locally. The selected model provider may charge for API calls.

1. Open me studio and create a project with a folder on your Mac.
2. Configure a provider and select an available model in Settings.
3. Describe a short motion-graphics video, including its subject, aspect ratio, duration, and whether it needs sound. Review the assistant's proposed direction before asking it to render.
4. Open the resulting preview or MP4 from the chat or file panel. Check the beginning, middle, and end before presenting it.
5. Switch interface language from Settings → General → Language. Existing chats and generated content retain their original language.

## Verified example and limits

A separate test using Meta Muse Spark 1.3 Contributor produced a silent 20-second 1280×720 GitLab/JiHu explainer with five distinct scenes. Frames sampled from the actual MP4 showed the scenes change; the file decoded without errors. This is a shortened test brief, not a complete recreation of the longer source clip, and its factual claims and creative quality have not been independently approved. The MP4 contains a silent AAC track.

The agent may need several turns, and generated animation quality varies by model and brief. Review claims and inspect the actual video before sharing. The current app does not guarantee automatic synchronization of an uploaded narration track. Do not claim a cloud product or one-click completion of a longer voiced film based on this example.

The app does not need a separate video-generation API: HTML is rendered to video locally. Model and optional voice services have their own requirements and costs. On first use, configure credentials locally; do not record or share them in a demo.
