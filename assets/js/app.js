// Open letter sign-up page. Sends the form to the campaign's Apps Script endpoint and shows
// the signer's personal link the moment it comes back. No cookies, no trackers.
(function () {
  'use strict';

  var C = window.OPEN_LETTER;
  var $ = function (id) { return document.getElementById(id); };
  var startedAt = Date.now();
  var SC01_COUNTIES = ['Beaufort', 'Berkeley', 'Charleston', 'Colleton', 'Dorchester', 'Jasper'];
  var OTHER_COUNTIES = ['Abbeville', 'Aiken', 'Allendale', 'Anderson', 'Bamberg', 'Barnwell', 'Calhoun', 'Cherokee', 'Chester',
    'Chesterfield', 'Clarendon', 'Darlington', 'Dillon', 'Edgefield', 'Fairfield', 'Florence', 'Georgetown', 'Greenville',
    'Greenwood', 'Hampton', 'Horry', 'Kershaw', 'Lancaster', 'Laurens', 'Lee', 'Lexington', 'Marion', 'Marlboro', 'McCormick',
    'Newberry', 'Oconee', 'Orangeburg', 'Pickens', 'Richland', 'Saluda', 'Spartanburg', 'Sumter', 'Union', 'Williamsburg', 'York'];
  var RETRY_DELAYS = [3000, 6000, 10000];
  var DONE_KEY = 'ol-done';
  var INVITE_KEY = 'ol-r';

  var store = {
    get: function (k) { try { return window.sessionStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.sessionStorage.setItem(k, v); } catch (e) { /* private mode */ } },
    del: function (k) { try { window.sessionStorage.removeItem(k); } catch (e) { /* private mode */ } }
  };

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }

  // ---------- Content ----------
  if (C.test) $('ribbon').hidden = false;
  document.querySelectorAll('[data-outlets]').forEach(function (el) { el.textContent = C.outlets; });
  document.querySelectorAll('[data-privacy]').forEach(function (el) { el.textContent = C.privacy; });
  document.querySelectorAll('[data-disclaimer]').forEach(function (el) { el.textContent = C.disclaimer; });
  $('letter-to').textContent = C.letter.to;
  C.letter.paragraphs.forEach(function (text) {
    var p = document.createElement('p');
    p.textContent = text;
    $('letter-paragraphs').appendChild(p);
  });
  if (C.letter.draftNote) { $('letter-draft').textContent = C.letter.draftNote; $('letter-draft').hidden = false; }
  $('sign-text').textContent = C.sign.replace(/^I sign this open letter\.\s*/, '');
  document.querySelectorAll('[data-consent]').forEach(function (el) { el.textContent = C.consents[el.getAttribute('data-consent')]; });
  SC01_COUNTIES.forEach(function (c) { $('county-sc01').appendChild(new Option(c, c)); });
  OTHER_COUNTIES.forEach(function (c) { $('county-other').appendChild(new Option(c, c)); });

  // ---------- Invite code from a personal link (?r=CODE) ----------
  var fromUrl = (new URLSearchParams(window.location.search).get('r') || '').toUpperCase().replace(/[^A-Z2-9]/g, '');
  var invite = /^[A-Z2-9]{4,12}$/.test(fromUrl) ? fromUrl : (store.get(INVITE_KEY) || '');
  if (invite) {
    store.set(INVITE_KEY, invite);
    $('inviteCode').value = invite;
    $('invited').hidden = false;
  }

  // ---------- Comment counter ----------
  var comment = $('comment');
  function updateCount() {
    var n = comment.value.length;
    $('comment-count').textContent = n + ' of 200 characters. Comments are reviewed before anything is sent. No links, please.';
  }
  comment.addEventListener('input', updateCount);

  // ---------- Validation ----------
  var form = $('form');
  var REQUIRED = {
    firstName: 'Please enter your first name.',
    lastName: 'Please enter your last name.',
    email: 'Please enter your email address.',
    town: 'Please enter your city or town.',
    county: 'Please choose your county.'
  };

  function setError(name, message) {
    var box = $(name + '-error');
    var input = form.elements[name];
    if (box) { box.textContent = message || ''; box.hidden = !message; }
    var targets = input && input.length !== undefined && !input.tagName ? Array.prototype.slice.call(input) : [input];
    targets.forEach(function (el) {
      if (!el || !el.setAttribute) return;
      if (message) { el.setAttribute('aria-invalid', 'true'); if (box) el.setAttribute('aria-describedby', box.id); }
      else { el.removeAttribute('aria-invalid'); }
    });
  }

  function radioValue(name) {
    var checked = form.querySelector('input[name="' + name + '"]:checked');
    return checked ? checked.value : '';
  }

  function validate() {
    var errors = [];
    Object.keys(REQUIRED).forEach(function (name) {
      var ok = String(form.elements[name].value || '').trim() !== '';
      setError(name, ok ? '' : REQUIRED[name]);
      if (!ok) errors.push(name);
    });
    var email = form.elements.email.value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('email', 'Please check your email address.'); errors.push('email'); }
    var phone = form.elements.phone.value.replace(/\D/g, '');
    if (phone && !(phone.length === 10 || (phone.length === 11 && phone.charAt(0) === '1'))) {
      setError('phone', 'Please enter a 10-digit US number, or leave it blank.'); errors.push('phone');
    } else { setError('phone', ''); }
    var zip = form.elements.zip.value.trim();
    if (zip && !/^\d{5}(-\d{4})?$/.test(zip)) { setError('zip', 'Five digits, like 29464.'); errors.push('zip'); } else { setError('zip', ''); }
    if (!radioValue('sc01')) { setError('sc01', 'Please choose Yes, No or Not sure.'); errors.push('sc01'); } else { setError('sc01', ''); }
    if (comment.value.trim().length > 200) { setError('comment', 'Please keep your comment to 200 characters.'); errors.push('comment'); }
    else { setError('comment', ''); }
    return errors;
  }

  function focusField(name) {
    var el = form.elements[name];
    if (el && el.length !== undefined && !el.tagName) el = el[0];
    if (el && el.focus) el.focus();
  }

  ['firstName', 'lastName', 'email', 'town', 'county', 'phone', 'zip'].forEach(function (name) {
    form.elements[name].addEventListener('input', function () { setError(name, ''); });
    form.elements[name].addEventListener('change', function () { setError(name, ''); });
  });
  form.querySelectorAll('input[name="sc01"]').forEach(function (el) { el.addEventListener('change', function () { setError('sc01', ''); }); });

  // ---------- Sending ----------
  var submissionId = uuid();
  var payload = null;
  var submitBtn = $('submit');
  var statusEl = $('status');

  function setStatus(text, isError) {
    statusEl.textContent = text || '';
    statusEl.classList.toggle('is-error', !!isError);
  }

  function setBusy(busy, text) {
    submitBtn.disabled = busy;
    submitBtn.querySelector('.submit-label').textContent = busy ? 'Adding your name' : 'Add my name';
    setStatus(text || '');
  }

  function collect() {
    var f = form.elements;
    return {
      submissionId: submissionId,
      elapsedMs: Date.now() - startedAt,
      website: f.website.value,
      firstName: f.firstName.value.trim(),
      lastName: f.lastName.value.trim(),
      email: f.email.value.trim(),
      phone: f.phone.value.trim(),
      town: f.town.value.trim(),
      county: f.county.value,
      zip: f.zip.value.trim(),
      sc01: radioValue('sc01'),
      signLetter: $('signLetter').checked === true,
      comment: comment.value.trim(),
      inviteCode: f.inviteCode.value,
      willingToIntroduce: radioValue('willingToIntroduce'),
      preferredContact: radioValue('preferredContact'),
      shareEmail: f.shareEmail.checked === true,
      campaignEmailOk: f.campaignEmailOk.checked === true,
      textOk: f.textOk.checked === true
    };
  }

  function send(attempt) {
    setBusy(true, attempt ? 'Lots of people are signing. Still working on it.' : '');
    var controller = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (controller) controller.abort(); }, 30000);
    fetch(C.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      signal: controller ? controller.signal : undefined
    }).then(function (res) {
      clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }).then(function (res) {
      handle(res, attempt);
    }).catch(function () {
      clearTimeout(timer);
      retry(attempt);
    });
  }

  function retry(attempt) {
    if (attempt < RETRY_DELAYS.length) {
      setTimeout(function () { send(attempt + 1); }, RETRY_DELAYS[attempt]);
      return;
    }
    setBusy(false);
    setStatus("We couldn't reach the server. Check your connection and tap Add my name again. You won't be signed twice.", true);
  }

  function handle(res, attempt) {
    if (res && res.state === 'new') return showDone(res);
    if (res && res.state === 'check_email') return showPanel('check');
    if (res && res.state === 'invalid') {
      setBusy(false);
      setError(res.field, res.message || 'Please check this answer.');
      focusField(res.field);
      return;
    }
    if (res && (res.state === 'busy' || res.state === 'error')) return retry(attempt);
    setBusy(false);
    setStatus('Something went wrong. Please try again.', true);
  }

  // One reminder if the letter box is unticked; never ticked for them (the signature is their choice).
  var nudged = false;
  $('signLetter').addEventListener('change', function () { $('sign-nudge').hidden = true; });

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    var errors = validate();
    if (errors.length) {
      setStatus('Please fix the ' + (errors.length === 1 ? 'highlighted answer' : errors.length + ' highlighted answers') + ' above.', true);
      focusField(errors[0]);
      return;
    }
    if (!$('signLetter').checked && !nudged) {
      nudged = true;
      $('sign-nudge').hidden = false;
      $('signLetter').closest('.signature').scrollIntoView({ block: 'center' });
      $('signLetter').focus({ preventScroll: true });
      return;
    }
    $('sign-nudge').hidden = true;
    payload = collect();
    send(0);
  });

  // ---------- After signing ----------
  function showPanel(id) {
    form.hidden = true;
    $('done').hidden = id !== 'done';
    $('check').hidden = id !== 'check';
    var panel = $(id);
    panel.scrollIntoView({ block: 'start' });
    panel.focus({ preventScroll: true });
  }

  function shareLinks(link) {
    var text = C.shareText;
    $('personal-link').value = link;
    $('share-sms').href = 'sms:?&body=' + encodeURIComponent(text + ' ' + link);
    $('share-email').href = 'mailto:?subject=' + encodeURIComponent('Add your name to the SC-01 debate letter') +
      '&body=' + encodeURIComponent(text + '\n\n' + link);
    $('share-fb').href = 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(link);
    $('share-x').href = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent(link);
    if (navigator.share) {
      var native = $('share-native');
      native.hidden = false;
      native.onclick = function () {
        navigator.share({ title: 'Put every candidate on the debate stage', text: text, url: link }).catch(function () { /* dismissed */ });
      };
    }
  }

  function showDone(res) {
    var name = res.firstName && res.firstName !== 'there' ? res.firstName : '';
    $('done-title').textContent = name ? "You're in, " + name + '.' : "You're in.";
    $('done-lede').textContent = res.signed ? 'Your name is on the open letter.' : 'Thank you for signing up to support Bill.';
    shareLinks(res.referralLink);
    store.set(DONE_KEY, JSON.stringify({ firstName: name, signed: !!res.signed, referralLink: res.referralLink }));
    addStartOver();
    showPanel('done');
  }

  function addStartOver() {
    if ($('again')) return;
    var p = document.createElement('p');
    p.className = 'again';
    p.id = 'again';
    var b = document.createElement('button');
    b.type = 'button';
    b.textContent = 'Signing for someone else in your household? Start a new form';
    b.onclick = function () { store.del(DONE_KEY); window.location.href = window.location.pathname + (invite ? '?r=' + invite : ''); };
    p.appendChild(b);
    $('done').appendChild(p);
  }

  $('share-copy').addEventListener('click', function () {
    var input = $('personal-link');
    var label = $('copy-label');
    function ok() { label.textContent = 'Copied'; setTimeout(function () { label.textContent = 'Copy link'; }, 2200); }
    function manual() { input.focus(); input.select(); label.textContent = 'Press and hold to copy'; }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(input.value).then(ok, manual);
    } else {
      input.select();
      try { if (document.execCommand('copy')) ok(); else manual(); } catch (e) { manual(); }
    }
  });
  $('personal-link').addEventListener('focus', function () { this.select(); });

  // A reload after signing shows the link again instead of an empty form.
  var saved = store.get(DONE_KEY);
  if (saved) {
    try {
      var s = JSON.parse(saved);
      if (s && s.referralLink) {
        $('done-title').textContent = s.firstName ? "You're in, " + s.firstName + '.' : "You're in.";
        $('done-lede').textContent = s.signed ? 'Your name is on the open letter.' : 'Thank you for signing up to support Bill.';
        shareLinks(s.referralLink);
        addStartOver();
        form.hidden = true;
        $('done').hidden = false;
      }
    } catch (e) { store.del(DONE_KEY); }
  }
})();
