require('dotenv').config();

const DEPOT_API_URL = "http://4.224.186.213/evaluation-service/depots";
const VEHICLES_API_URL = "http://4.224.186.213/evaluation-service/vehicles";
const AUTH_TOKEN = process.env.LOG_API_TOKEN;

const optimizeSchedule = (vehicles, maxHours) => {
    const n = vehicles.length;
    const dp = Array.from({ length: n + 1 }, () => Array(maxHours + 1).fill(0));

    for (let i = 1; i <= n; i++) {
        const { Duration, Impact } = vehicles[i - 1];
        for (let w = 1; w <= maxHours; w++) {
            if (Duration <= w) {
                dp[i][w] = Math.max(Impact + dp[i - 1][w - Duration], dp[i - 1][w]);
            } else {
                dp[i][w] = dp[i - 1][w];
            }
        }
    }

    let res = dp[n][maxHours];
    let w = maxHours;
    const selected = [];
    let hoursUsed = 0;

    for (let i = n; i > 0 && res > 0; i--) {
        if (res !== dp[i - 1][w]) {
            const v = vehicles[i - 1];
            selected.push(v.TaskID);
            res -= v.Impact;
            w -= v.Duration;
            hoursUsed += v.Duration;
        }
    }

    return {
        maxScore: dp[n][maxHours],
        hoursUsed,
        selected: selected.reverse()
    };
};

const run = async () => {
    const headers = {
        "Authorization": `Bearer ${AUTH_TOKEN}`,
        "Content-Type": "application/json"
    };

    try {
        const [depotRes, vehicleRes] = await Promise.all([
            fetch(DEPOT_API_URL, { headers }),
            fetch(VEHICLES_API_URL, { headers })
        ]);

        const depotData = await depotRes.json();
        const vehicleData = await vehicleRes.json();

        for (const depot of depotData.depots) {
            const result = optimizeSchedule(vehicleData.vehicles, depot.MechanicHours);

            console.log(`Depot ID: ${depot.ID}`);
            console.log(`Max Score: ${result.maxScore}`);
            console.log(`Hours Used: ${result.hoursUsed}/${depot.MechanicHours}`);
            console.log(`Vehicles: [\n  ${result.selected.join(',\n  ')}\n]\n`);
        }
    } catch (error) {
        console.error(error.message);
    }
};

run();