/**
 * One-time Google Apps Script endpoint for the n8n job dropdown workflow.
 * Deploy as Web app, execute as the Form owner, and keep access restricted to
 * anyone with the link. Store the same token in Script Properties and n8n's
 * GOOGLE_FORM_SYNC_TOKEN environment variable.
 */
const FORM_ID = '1AqBqqfQT1CXqbGtDIp5DsXFtSzAwDEwiQ1kFNtX_16k';
const QUESTION_TITLE = 'Mã vị trí ứng tuyển';

function doPost(e) {
  try {
    const expected = PropertiesService.getScriptProperties().getProperty('SYNC_TOKEN');
    const payload = JSON.parse(e.postData.contents || '{}');
    const supplied = e?.parameter?.token || payload.token;
    if (!expected || supplied !== expected) return json({ success: false, error: 'Unauthorized' }, 401);

    const options = Array.isArray(payload.options) ? payload.options.filter(Boolean) : [];
    if (!options.length) return json({ success: false, error: 'options is empty' }, 400);

    const form = FormApp.openById(FORM_ID);
    const item = form.getItems(FormApp.ItemType.LIST)
      .map(item => item.asListItem())
      .find(item => item.getTitle() === QUESTION_TITLE);
    if (!item) return json({ success: false, error: 'Dropdown question not found' }, 404);
    item.setChoiceValues(options);
    return json({ success: true, updated: true, optionCount: options.length, formId: FORM_ID });
  } catch (error) {
    return json({ success: false, error: String(error?.message || error) }, 500);
  }
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Run once in the Apps Script editor after replacing the value. */
function setSyncToken() {
  PropertiesService.getScriptProperties().setProperty('SYNC_TOKEN', 'REPLACE_WITH_LONG_RANDOM_TOKEN');
}
