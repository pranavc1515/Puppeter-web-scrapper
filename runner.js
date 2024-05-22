// runner.js
const runner = async (scriptName, scriptFunction) => {
    try {
      console.log(`Running ${scriptName}...`);
      await scriptFunction();
      console.log(`${scriptName} finished successfully.`);
    } catch (error) {
      console.error(`${scriptName} threw an error:`, error);
    }
  };
  
  module.exports = runner;
  