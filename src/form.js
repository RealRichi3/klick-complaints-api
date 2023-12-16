const { FORM_URL } = require("./config");
const axios = require('axios');

async function submitToGoogleForm(fullname, complaint, documentUrl, orderNumber) {
    const entryIds = {
        fullname: 'entry.2101748424',
        orderNumber: 'entry.21654393',
        complaint: 'entry.2135753796',
        documentUrl: 'entry.310305865'
    };

    const encodedFullname = encodeURIComponent(fullname);
    const encodedComplaint = encodeURIComponent(complaint);
    const encodedDocumentUrl = encodeURIComponent(documentUrl);
    const encodedOrderNumber = encodeURIComponent(orderNumber);

    const url = `${FORM_URL}/formResponse?usp=pp_url&${entryIds.fullname}=${encodedFullname}&${entryIds.complaint}=${encodedComplaint}&${entryIds.documentUrl}=${encodedDocumentUrl}&${entryIds.orderNumber}=${encodedOrderNumber}`;

    await axios.post(url).catch(error => {
        console.log(error.response)
    })
}

module.exports = {
    submitToGoogleForm
}