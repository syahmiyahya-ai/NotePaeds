# Generate integration

Tools → Generate provides Summary, Referral memo and Home advice leaflet in English or Bahasa Melayu.

Only age, gender and weight are copied from the active patient's note. Clinical information is entered separately and reviewed before sending. There are no name, WCH, DOB, address or contact fields in the request's patient object. Free-text clinical information must be checked for identifying information; this is not an automatic anonymisation service.

The native Tauri command calls Google's Gemini `generateContent` REST API over HTTPS. The API key is sent only in the `x-goog-api-key` header, never in the URL, and is never returned to the HTML. Key lookup order is the in-memory key saved from AI connection, then the encrypted `HKCU\Software\NotePaeds\AI\GeminiApiKey` value, then the Windows user environment `GEMINI_API_KEY` (or `GOOGLE_API_KEY` if that is unset), then the same names in the process environment. A key stored under the previous registry value name is not read. Saving a key encrypts it for this Windows account and keeps it in native memory. Test connection checks authentication with `GET /v1beta/models`. `GEMINI_MODEL` optionally overrides the default `gemini-3.8-flash` used for text and ICD-10. No key is bundled or stored in browser preferences. Requests do not set cached content.

The standalone HTML displays the same panel but cannot generate without a native backend connection. Version 8.3.1 is delivered as a portable Windows package. Older installers do not include these updates.

Results appear as editable drafts. Copy and Insert require a completed response; inserting is tied to the original patient tab. Clinical text is treated as data. Additional instructions can request tone, length and structure without overriding safety rules. Empty, refused, safety-blocked or incomplete API responses are not inserted. Text requests time out after 120 seconds and are not automatically retried. An elapsed-time indicator is shown during work; duplicate generations are prevented. Closing/reopening the panel preserves the request and draft in memory, but closing the application does not.

Home advice can be turned into an image only after the clinician reviews the text and separately agrees to send that text and appearance preferences to Google Gemini. The native call uses `gemini-nano-banana-2.1` with portrait aspect ratio `2:3` (the same ratio as the previous 1024×1536 output) and `1K` size, and accepts only PNG bytes. It has a 300-second timeout and no automatic retry. The generated image may change or omit wording: review every dose, warning and instruction against the approved text before using Save PNG or Print image. Editing the text clears the old image so it cannot be mistaken for an updated version. This is not an approved official form. Image requests incur separate API usage and are subject to the account's access, quota and data policies.

SCAN, asthma action plan and measles printables remain KIV until matching approved templates are supplied.

Connection status for this update: request building and response parsing were tested without a live Gemini call. No live clinical request or image generation was made during this update.

References: [generateContent](https://ai.google.dev/api/generate-content), [Image generation](https://ai.google.dev/gemini-api/docs/image-generation), [Models](https://ai.google.dev/gemini-api/docs/models).
