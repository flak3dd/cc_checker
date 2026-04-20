# DonorPerfect Form Selectors

**URL**: https://wl.donorperfect.net/weblink/FormSingleNM.aspx?formId=45&id=4&name=E348891QE

## General
- **Main Form**: `id="thisForm"`
- **Submit Button (Next)**: `id="btnConfirm12345"`

## Donation Amount
- **Preset Amount Radios**: `[name$="giftPledgeAmount:ucOtherAmountRbl"]`
    - **$500**: `id$="giftPledgeAmount_ucGPOtherAmountRbl_0"`
    - **$250**: `id$="giftPledgeAmount_ucGPOtherAmountRbl_1"`
    - **$100**: `id$="giftPledgeAmount_ucGPOtherAmountRbl_2"`
    - **$50**: `id$="giftPledgeAmount_ucGPOtherAmountRbl_3"`
    - **$25**: `id$="giftPledgeAmount_ucGPOtherAmountRbl_4"`
    - **Other (Radio)**: `id$="giftPledgeAmount_ucGPOtherAmountRbl_5"`
- **Custom Amount Input**: `id$="giftPledgeAmount_ucGPOtherAmountTxt_5"`

## Donor Information
- **First Name**: `id="first_name_ucTxtBox"`
- **Last Name**: `id="last_name_ucTxtBox"`
- **Email**: `id="email_ucEmail"`
- **Address**: `id="address_ucTxtBox"`
- **City**: `id="city_ucTxtBox"`
- **Province/State**: `id="state_ucDDL"`
- **Postal Code**: `id="zip_ucTxtBox"`
- **Country**: `id="country_ucDDL"`
- **Home Phone**: `id="home_phone_ucPhone"`
- **Cell Phone**: `id="mobile_phone_ucPhone"`
- **Work Phone**: `id="business_phone_ucPhone"`

## Payment Information
- **Card Holder Name**: `id="CardHolderName_ucTxtBox"`
- **Card Account Number**: `id="CardAccountNum_ucNumericTxt"`
- **Expiration Month**: `id="ExpirationDate_ucExpirationMonth"`
- **Expiration Year**: `id="ExpirationDate_ucExpirationYear"`
- **CVV**: `id="CVV2_ucNumericTxt"`

## Tribute / Dedication
- **Dedication Checkbox**: `id$="is_tribute||N|is_tribute"`
- **Tribute Type (In Memory/Honor)**: `id$="memory_honor||N|memory_honor_ucDDL"`
- **Tribute Name**: `id$="tribute_name||N|tribute_name"`

## ASP.NET Hidden Fields
- `__VIEWSTATE`
- `__EVENTTARGET`
- `__EVENTARGUMENT`
- `__LASTFOCUS`
- `__EVENTVALIDATION` (if present)
- `__VIEWSTATEGENERATOR`
