# Generate integration

Tools → Generate provides Summary, Referral memo and Home advice leaflet in English or Bahasa Melayu.

Only age, gender and weight are copied from the active patient's note. Clinical information is entered separately and reviewed before sending. There are no name, WCH, DOB, address or contact fields in the request's patient object. Free-text clinical information must be checked for identifying information; this is not an automatic anonymisation service.

The native Tauri command calls OpenAI's Responses API over HTTPS. It reads the existing Windows user `OPENAI_API_KEY` setting, with the native process environment as fallback, and never returns the key to the HTML. API key settings also accepts a session-only key: the password field is cleared after submission, and the key stays in native memory until the app closes. It does not update the saved Windows key. Test connection checks authentication through the models endpoint. `OPENAI_MODEL` optionally overrides the default `gpt-4.1-mini`. No key is bundled or stored in browser preferences. Text requests use `store: false`; this does not assert zero retention across all OpenAI account data policies.

The standalone HTML displays the same panel but cannot generate without a native backend connection. Version 8.3.1 is delivered as a portable Windows package. Older installers do not include these updates.

Results appear as editable drafts. Copy and Insert require a completed response; inserting is tied to the original patient tab. Clinical text is treated as data. Additional instructions can request tone, length and structure without overriding safety rules. Empty, refused or incomplete API responses are not inserted. Text requests time out after 120 seconds and are not automatically retried. An elapsed-time indicator is shown during work; duplicate generations are prevented. Closing/reopening the panel preserves the request and draft in memory, but closing the application does not.

Home advice can be turned into an image only after the clinician reviews the text and separately agrees to send that text and appearance preferences to OpenAI. The native Images API call uses `gpt-image-1.5`, high quality and portrait PNG output. It has a 300-second timeout and no automatic retry. The generated image may change or omit wording: review every dose, warning and instruction against the approved text before using Save PNG or Print image. Editing the text clears the old image so it cannot be mistaken for an updated version. This is not an approved official form. Image requests incur separate API usage and are subject to the account's access, quota and data policies.

SCAN, asthma action plan and measles printables remain KIV until matching approved templates are supplied.

Connection status for this update: the existing key authenticated successfully through the models endpoint, and both configured models were listed. New generation interactions and image responses were tested with mocked responses, not real patient information. No live clinical request or image generation was made during this update.

References: [Responses API](https://platform.openai.com/docs/api-reference/responses/create), [Image generation](https://developers.openai.com/api/docs/guides/image-generation).
