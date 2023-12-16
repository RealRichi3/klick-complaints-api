const { FORM_URL } = require("./config");
const axios = require('axios');

async function submitToGoogleForm(fullname, complaint, documentUrl) {
    const entryIds = {
        fullname: 'entry.2101748424',
        complaint: 'entry.2135753796',
        documentUrl: 'entry.2119364926'
    };

    const encodedFullname = encodeURIComponent(fullname);
    const encodedComplaint = encodeURIComponent(complaint);
    const encodedDocumentUrl = encodeURIComponent(documentUrl);

    const url = `${FORM_URL}/formResponse?usp=pp_url&${entryIds.fullname}=${encodedFullname}&${entryIds.complaint}=${encodedComplaint}&${entryIds.documentUrl}=${encodedDocumentUrl}`;

    await axios.post(url).catch(error => {
        console.log(error.response)
    })
}

module.exports = {
    submitToGoogleForm
}