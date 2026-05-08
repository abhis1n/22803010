require('dotenv').config();

const NOTIFICATION_API_URL = "http://4.224.186.213/evaluation-service/notifications";
const AUTH_TOKEN = process.env.LOG_API_TOKEN;

const TYPE_WEIGHTS = {
    "placement": 3,
    "result": 2,
    "event": 1
};

const calculatePriority = (a, b) => {
    const weightA = TYPE_WEIGHTS[a.Type.toLowerCase()] || 0;
    const weightB = TYPE_WEIGHTS[b.Type.toLowerCase()] || 0;

    if (weightA !== weightB) {
        return weightB - weightA;
    }

    const timeA = new Date(a.Timestamp).getTime();
    const timeB = new Date(b.Timestamp).getTime();

    return timeB - timeA;
};

const getPriorityInbox = async (n = 10) => {
    try {
        if (!AUTH_TOKEN) throw new Error("Missing LOG_API_TOKEN in .env file");

        const response = await fetch(NOTIFICATION_API_URL, {
            headers: {
                "Authorization": `Bearer ${AUTH_TOKEN}`,
                "Content-Type": "application/json"
            }
        });

        if (!response.ok) throw new Error(`API failed with status: ${response.status}`);

        const data = await response.json();
        const notifications = data.notifications || [];

        const topNotifications = notifications.sort(calculatePriority).slice(0, n);

        console.log(`\nTop ${n} Priority Inbox`);
        topNotifications.forEach((notif, index) => {
            console.log(`${index + 1}. [${notif.Type.toUpperCase()}] ${notif.Message}`);
            console.log(`   Time: ${notif.Timestamp} | ID: ${notif.ID}\n`);
        });

    } catch (error) {
        console.error("Error generating Priority Inbox:", error.message);
    }
};

getPriorityInbox(10);