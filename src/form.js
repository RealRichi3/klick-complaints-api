const { FORM_URL } = require("./config");
const axios = require("axios");
const qs = require("qs");

async function submitToGoogleForm(
    fullname,
    complaint,
    documentUrl,
    orderNumber,
) {
    const entryIds = {
        fullname: "entry.2101748424",
        orderNumber: "entry.21654393",
        complaint: "entry.2135753796",
        documentUrl: "entry.310305865",
    };

    const formData = {
        [entryIds.fullname]: fullname,
        [entryIds.orderNumber]: orderNumber,
        [entryIds.complaint]: complaint,
        [entryIds.documentUrl]: documentUrl,
    };

    const url = `${FORM_URL}/formResponse?usp=pp_url`;

    try {
        const response = await axios.post(url, qs.stringify(formData), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            timeout: 10000, // Set timeout to 10 seconds
        });
        console.log(`Form submitted successfully: ${response.status}`);
    } catch (error) {
        if (error.response) {
            console.error(
                `Error submitting form: ${error.response.status} - ${error.response.statusText}`,
            );
        } else if (error.request) {
            console.error("No response received from the server.");
        } else {
            console.error(`Error setting up the request: ${error.message}`);
        }
    }
}

module.exports = {
    submitToGoogleForm,
};

