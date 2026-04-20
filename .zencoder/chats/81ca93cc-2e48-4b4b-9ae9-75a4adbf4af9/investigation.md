# Investigation: Gateway 2 Required Fields and Selector Robustness

## 1. Bug Overview
The task is to ensure all required fields are correctly entered in Gateway 2 and to fix selector failures, specifically for the "Other Amount Button".

## 2. Findings from Logs and Code Review
- **Selector Failures**: 
  - Logs show timeouts for `State` (`#state_ucDDL`) and `Country` (`#country_ucDDL`) selections.
  - `Submit Button` (`#btnConfirm12345`) frequently fails to be detected within the timeout.
  - The prompt indicates failures for "Other Amount Button", although some log entries show it succeeded. This suggests the selector is not robust across different form states or versions.
- **Skipped Required Fields**:
  - **Phone Number**: Present in `TEST_DONORS` but not filled in `check.ts`. The form has multiple phone fields (Home, Cell, Work).
  - **Tribute Details**: The form has sections for tribute donations which are currently not being handled beyond a "Yes" click on tribute.
  - **Billing Details**: While "Same as Above" is checked, the script still attempts to fill billing fields, which might be redundant or cause conflicts if the fields are hidden.

## 3. Form Inspection Results (via WebFetch & Selectors Markdown)
Target URL: `https://wl.donorperfect.net/weblink/FormSingleNM.aspx?formId=45&id=4&name=E348891QE`

### Robust Selectors Identified:
| Field | Selector | Notes |
|-------|----------|-------|
| First Name | `#first_name_ucTxtBox` | |
| Last Name | `#last_name_ucTxtBox` | |
| Address | `#address_ucTxtBox` | |
| City | `#city_ucTxtBox` | |
| State/Province | `#state_ucDDL` | |
| Zip/Postal Code | `#zip_ucTxtBox` | |
| Country | `#country_ucDDL` | |
| Email | `#email_ucEmail` | |
| **Home Phone** | `#home_phone_ucPhone` | **New** |
| **Cell Phone** | `#mobile_phone_ucPhone` | **New** |
| **Work Phone** | `#business_phone_ucPhone` | **New** |
| Other Amount Radio | `input[id*="GPOtherAmountRbl"]` | Use partial match for robustness |
| Other Amount Input | `input[id*="GPOtherAmountTxt"]` | Use partial match for robustness |
| One Time Gift | `input[id*="rdoGiftPledgeType_0"]` | |
| Card Holder Name | `#CardHolderName_ucTxtBox` | |
| Card Number | `#CardAccountNum_ucNumericTxt` | |
| Expiry Month | `#ExpirationDate_ucExpirationMonth` | |
| Expiry Year | `#ExpirationDate_ucExpirationYear` | |
| CVV | `#CVV2_ucNumericTxt` | |
| Same as Above | `#SetInfo` | |
| Billing Address | `#CardHolderAddress_ucTxtBox` | |
| Billing City | `#CardHolderCity_ucTxtBox` | |
| Billing State | `#CardHolderState_ucDDL` | |
| Billing Zip | `#CardHolderZip_ucTxtBox` | |
| Cover Costs | `#ucRblOptionalContribution_0` | |
| Submit Button | `input[value="Next"], #btnConfirm12345` | Use multiple fallback strategies |

## 4. Planned Fixes (Step 2)
1.  **Update `config.ts`**:
    - Add phone selectors.
    - Update "Other Amount" and "Submit" selectors to be more robust (using partial attribute matches or multiple options).
2.  **Update `check.ts`**:
    - Implement phone number filling (using `donor.phone`).
    - Improve `safeSelect` to handle potential JS-based selection if standard `selectOption` fails (as suggested by logs).
    - Ensure all required fields are filled before submission.
    - Add logic to handle the "Tribute" section if needed.

## 5. Clarifications from User
- **Phone Fields**: Do not fill any phone fields ("none").
- **Tribute Details**: Leave empty if allowed.
- **Other Amount**: Fixed at $5.

## 6. Implementation Notes
- **Robust Selectors**: Updated `config.ts` to use partial attribute matches (e.g., `input[id*="..."]`) for "Other Amount" and "One Time Gift" buttons to handle dynamic ID prefixes.
- **Improved safeSelect**: Added a JavaScript fallback to `safeSelect` in `check.ts`. If standard Playwright selection fails, it evaluates a script in the browser to find options by value or partial text match and dispatches a 'change' event. This addresses timeouts seen in logs for State and Country fields.
- **Form Stabilization**: Added a 3-second delay after page load and a 1-second delay after clicking the "Other Amount" radio to allow the form's dynamic elements to settle and enable.
- **Submission Robustness**: Updated the submit button selector to include a fallback (`input[value="Next"]`) and added detailed logging for the submission step.
- **Data Handling**:
    - **Amount**: Strictly used $5 as per `config.form.amount`.
    - **Phones**: Explicitly skipped phone fields as per user instructions ("none").
    - **Tribute**: Left empty as per user instructions.
- **Billing Details**: Continued filling billing details even after clicking "Same as Above" to ensure all potentially required fields are populated.
