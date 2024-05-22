// index.js
const runner = require('./runner');

const activities = require('./activities');
const experience = require('./experience');
const guide = require('./guide');
const placesToVisit = require('./places-to-visit');
const places = require('./places');
const allRemainingPages = require('./allRemainingPages');

const runAllScripts = async () => {
  await runner('activities', activities);
  await runner('experience', experience);
  await runner('guide', guide);
  await runner('placesToVisit', placesToVisit);
  await runner('places', places);
  await runner('allRemainingPages', allRemainingPages);
};

runAllScripts();
