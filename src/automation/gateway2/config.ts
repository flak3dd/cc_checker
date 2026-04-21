export const config = {
    form: {
        url: "https://wl.donorperfect.net/weblink/FormSingleNM.aspx?formId=45&id=4&name=E348891QE",
        amount: "5"
    },
    selectors: {
        firstName: '#first_name_ucTxtBox',
        lastName: '#last_name_ucTxtBox',
        address: '#address_ucTxtBox',
        city: '#city_ucTxtBox',
        state: '#state_ucDDL',
        country: '#country_ucDDL',
        zip: '#zip_ucTxtBox',
        email: '#email_ucEmail',
        cardHolderName: '#CardHolderName_ucTxtBox',
        cardNumber: '#CardAccountNum_ucNumericTxt',
        expiryMonth: '#ExpirationDate_ucExpirationMonth',
        expiryYear: '#ExpirationDate_ucExpirationYear',
        cvv: '#CVV2_ucNumericTxt',
        sameAsAbove: '#SetInfo',
        billingAddress: '#CardHolderAddress_ucTxtBox',
        billingCity: '#CardHolderCity_ucTxtBox',
        billingState: '#CardHolderState_ucDDL',
        billingCountry: '#CardHolderCountry_ucDDL',
        billingZip: '#CardHolderZip_ucTxtBox',
        coverCosts: '#ucRblOptionalContribution_0',
        otherAmountRadio: 'input[id*="GPOtherAmountRbl"]',
        otherAmountInput: 'input[id*="GPOtherAmountTxt"]',
        oneTimeGift: 'input[id*="rdoGiftPledgeType_0"]',
        tributeYes: 'input[id*="is_tribute"]',
        nextBtn: 'input[value="Next"], #btnConfirm12345',
        submitBtn: 'input[value="Submit"], button:has-text("Submit"), input[value="Process"], button:has-text("Process"), #btnSubmit',
    },
    timeouts: {
        waitForSelector: 10000,
        waitForClick: 12000,
        pageLoad: 30000,
        resultWait: 60000,
        delayBetweenCards: 4000,
    },
    country: {
        default: 'US',
    },
};

export default config;