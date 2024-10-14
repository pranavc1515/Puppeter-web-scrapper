require('dotenv').config();

const runner = require('./runner');

const experience = require('./experience');
const guide = require('./guide');
const placesToVisit = require('./places-to-visit');
const allRemainingPages = require('./allRemainingPages');
const activities = require('./activities');
const places = require('./places');

const allNotDonepages = require('./allNotDonepages');

const runAllScripts = async () => {
  try {
    await Promise.all([
      // runner('experience', experience),
      // runner('guide', guide),

      // runner('allRemainingPages', allRemainingPages),
      runner('activities', activities),
      // runner('places', places),
      // runner('allNotDonepages', allNotDonepages),
    ]);

    console.log('All scripts completed successfully.');
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

runAllScripts();
