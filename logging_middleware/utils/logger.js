const LOG_API_URL = "http://4.224.186.213/evaluation-service/logs";
// Store your actual token in a .env file
const AUTH_TOKEN = process.env.LOG_API_TOKEN;

async function Log(stack, level, pkg, message) {
  const payload = {
    stack: stack,
    level: level,
    package: pkg,
    message: message
  };

  try {
    const response = await fetch(LOG_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${AUTH_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error(`${response.status}`);
    }

  } catch (error) {
    console.error(error.message);
  }
}

module.exports = { Log };