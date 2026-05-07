const axios = require('axios');

async function fetchData() {
    try {
        const url = 'http://127.0.0.1:3001/api/proxy/crm-test/api/queues';
        console.log(`Fetching ${url}...`);
        const response = await axios.get(url);
        console.log('Status:', response.status);
        console.log('Data (first 3 items):');
        console.log(JSON.stringify(response.data.slice(0, 3), null, 2));
        
        // Check for 'idle' state in any item
        const idleItems = response.data.filter(item => item.state === 'idle');
        console.log(`Found ${idleItems.length} items with state='idle'.`);
        if (idleItems.length > 0) {
            console.log('Sample idle item:', JSON.stringify(idleItems[0], null, 2));
        }

        // Check for consumer_utilisation
        console.log('Checking consumer_utilisation...');
        const withUtil = response.data.filter(item => item.consumer_utilisation !== undefined);
        console.log(`Found ${withUtil.length} items with consumer_utilisation.`);
        if (withUtil.length > 0) {
             console.log('Sample item with utils:', JSON.stringify(withUtil[0], null, 2));
        }

    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

fetchData();
