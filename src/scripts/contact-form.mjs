export function initContactForm() {
  const form = document.querySelector('[data-contact-form]');
  if (!form?.hidden) return;
  form.hidden = false;
  form.addEventListener('submit', event => {
    event.preventDefault();
    const subject = form.elements.namedItem('subject');
    const message = form.elements.namedItem('message');
    const status = form.querySelector('[data-contact-status]');
    const incomplete = [subject, message].find(field => !field.value.trim());
    if (incomplete) {
      status.textContent = `Enter a ${incomplete.name}.`;
      incomplete.focus();
      return;
    }
    const draft = document.createElement('a');
    const recipient = form.parentElement.querySelector('[data-contact-email]').href;
    const body = message.value.trim().replace(/\r?\n/g, '\r\n');
    draft.href = `${recipient}?subject=${encodeURIComponent(subject.value.trim().toWellFormed())}&body=${encodeURIComponent(body.toWellFormed())}`;
    draft.hidden = true;
    form.append(draft);
    draft.click();
    draft.remove();
    status.textContent = 'Review and send the draft in your email app.';
  });
}
