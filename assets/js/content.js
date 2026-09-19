// Everything a campaign person might need to change, in one place.
// Keep the letter and consent wording identical to the Sheet's CONFIG tab and Config.js.
window.OPEN_LETTER = {
  test: true, // shows the TEST ribbon; set false on the live copy
  apiUrl: 'https://script.google.com/macros/s/AKfycbw_kyJHlVdSxL-vel3GyZsYZzZxL7-EGNlRyGYUEJcXBhEqVcihGcPJc0prUwnTKzJBwQ/exec',
  pageUrl: 'https://drugsforrobots.github.io/reeside-open-letter-test/',
  campaignUrl: 'https://reesideforcongress.com',
  disclaimer: 'Paid for by Reeside for Congress',
  privacy: 'Reeside for Congress will never sell or rent your information, and shares it only as you choose on this form.',
  outlets: 'local TV stations and news outlets',

  letter: {
    to: 'To the news directors of Lowcountry television stations and news outlets:',
    paragraphs: [
      "We, the undersigned, ask you to host a general-election debate for South Carolina's 1st Congressional District before early voting begins, and to invite every candidate on the ballot, including Libertarian nominee Bill Reeside.",
      'Voters deserve to hear from all of their choices. If you use criteria to decide who takes part, we ask that you publish them now, so every candidate and every voter knows the standard.'
    ],
    draftNote: 'Draft: pending approval by Bill Reeside.' // remove once approved
  },

  sign: 'I sign this open letter. Reeside for Congress may send my name, town and comment to the outlets named above, and they may publish them.',
  consents: {
    shareEmail: 'Also share my email address with those outlets so a reporter can confirm I signed.',
    campaignEmailOk: 'Send me campaign updates by email.',
    textOk: 'Send me campaign text messages at the number above. Message and data rates may apply. Reply STOP to opt out.'
  },

  shareText: 'I signed an open letter asking Lowcountry TV stations to put every SC-01 candidate on the debate stage, including Bill Reeside. Add your name:'
};
