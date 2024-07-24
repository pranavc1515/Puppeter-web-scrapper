require('dotenv').config();

const runner = require('./runner');

const activities = require('./activities');
const experience = require('./experience');
const guide = require('./guide');
const placesToVisit = require('./places-to-visit');
const places = require('./places');
const allRemainingPages = require('./allRemainingPages');
const place = require('./place');
const activity = require('./activity');

const runAllScripts = async () => {
  try {
    await Promise.all([
      runner('activities', activities),
      runner('experience', experience),
      runner('guide', guide),
      runner('placesToVisit', placesToVisit),
      runner('places', places),
      runner('place', place),
      runner('activity', activity),
      runner('allRemainingPages', allRemainingPages),
    ]);

    console.log('All scripts completed successfully.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

runAllScripts();
