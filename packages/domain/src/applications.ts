/**
 * Application names returned by Transaction Search and Transaction Details.
 * Labels for the seven identifiers called out by this tester match the product
 * language in the task. `official` is the Services Returned by the API table:
 * https://developer.cybersource.com/docs/cybs/en-us/txn-search/developer/all/rest/txn-search.html
 */
export interface ApplicationName {
  readonly label: string;
  readonly official: string;
}

export const APPLICATION_NAMES: Readonly<Record<string, ApplicationName>> = {
  ics_score: { label: "Fraud Screening", official: "Advanced Fraud Screen" },
  ics_ap_auth: { label: "Alt Pay Authorization", official: "Alt Pay Authorization" },
  ics_ap_auth_reversal: {
    label: "Alt Pay Authorization Reversal",
    official: "Alt Pay Authorization Reversal",
  },
  ics_ap_billing_agreement: {
    label: "Alt Pay Billing Agreement",
    official: "Alt Pay Billing Agreement",
  },
  ics_ap_cancel: { label: "Alt Pay Cancel", official: "Alt Pay Cancel" },
  ics_ap_capture: { label: "Alt Pay Capture", official: "Alt Pay Capture" },
  ics_ap_initiate: { label: "Alt Pay Initiate", official: "Alt Pay Initiate" },
  ics_ap_options: { label: "Alt Pay Options", official: "Alt Pay Options" },
  ics_ap_order: { label: "Alt Pay Order", official: "Alt Pay Order" },
  ics_ap_refund: { label: "Alt Pay Refund", official: "Alt Pay Refund" },
  ics_ap_sale: { label: "Alt Pay Sale", official: "Alt Pay Sale" },
  ics_ap_sessions: { label: "Alt Pay Session", official: "Alt Pay Session" },
  ics_ap_check_status: { label: "Alt Pay Service Status", official: "Alt Pay Service Status" },
  ics_auto_auth_reversal: {
    label: "Automatic Authorization Reversal",
    official: "Automatic Authorization Reversal",
  },
  ics_bank_transfer: { label: "Bank Transfer", official: "Bank Transfer" },
  ics_bank_transfer_real_time: {
    label: "Bank Transfer Real Time",
    official: "Bank Transfer Real Time",
  },
  ics_bank_transfer_refund: { label: "Bank Transfer Refund", official: "Bank Transfer Refund" },
  ics_bin_lookup: { label: "BIN Lookup Service", official: "BIN Lookup Service" },
  ics_boleto_payment: { label: "Boleto Payment", official: "Boleto Payment" },
  ics_auth: { label: "Card Authorization", official: "Card Authorization" },
  ics_auth_reversal: {
    label: "Authorization Reversal",
    official: "Card Full Authorization Reversal",
  },
  ics_bill: { label: "Card Settlement", official: "Card Settlement" },
  ics_credit: { label: "Card Credit", official: "Card Credit" },
  ics_cm_action: { label: "Case Management Action", official: "Case Management Action" },
  ics_china_payment: { label: "China Payment", official: "China Payment" },
  ics_china_refund: { label: "China Refund", official: "China Refund" },
  ics_auto_full_auth_reversal: {
    label: "Credit Card Auto Full Authorization Reversal",
    official: "Credit Card Auto Full Authorization Reversal",
  },
  ics_auth_refresh: {
    label: "Credit Card System Authorization",
    official: "Credit Card System Authorization",
  },
  ics_credit_auth: {
    label: "Credit Card Credit Authorization",
    official: "Credit Card Credit Authorization",
  },
  ics_risk_update: { label: "Customer List Modification", official: "Customer List Modification" },
  ics_dcc: { label: "Dynamic Currency Conversion Lookup", official: "DCC Lookup" },
  ics_dcc_update: { label: "DCC Update", official: "DCC Update" },
  ics_decision: { label: "Decision Manager", official: "Decision Manager" },
  ics_dm_event: { label: "Decision Manager Events", official: "Decision Manager Events" },
  ics_direct_debit: { label: "Direct Debit", official: "Direct Debit" },
  ics_direct_debit_mandate: { label: "Direct Debit Mandate", official: "Direct Debit Mandate" },
  ics_direct_debit_refund: { label: "Direct Debit Refund", official: "Direct Debit Refund" },
  ics_direct_debit_validate: {
    label: "Direct Debit Validation",
    official: "Direct Debit Validation",
  },
  ics_ecp_authenticate: {
    label: "Electronic Check Authenticate",
    official: "Electronic Check Authenticate",
  },
  ics_ecp_credit: { label: "Electronic Check Credit", official: "Electronic Check Credit" },
  ics_ecp_debit: { label: "Electronic Check Debit", official: "Electronic Check Debit" },
  ics_ecp_avs: {
    label: "Electronic Check Account Validation",
    official: "Electronic Check Account Validation",
  },
  ics_get_masterpass_data: { label: "Get MasterPass Data", official: "Get MasterPass Data" },
  ics_get_visa_checkout_data: { label: "Get Visa Click to Pay", official: "Get Visa Click to Pay" },
  ics_create_isv: { label: "Gift Certificate Creation", official: "Gift Certificate Creation" },
  ics_get_isv_history: { label: "Gift Certificate History", official: "Gift Certificate History" },
  ics_add_value_to_isv: {
    label: "Gift Certificate Increase",
    official: "Gift Certificate Increase",
  },
  ics_get_isv_info: {
    label: "Gift Certificate Information",
    official: "Gift Certificate Information",
  },
  ics_modify_isv: {
    label: "Gift Certificate Modification",
    official: "Gift Certificate Modification",
  },
  ics_get_isv_profiles: {
    label: "Gift Certificate Profiles",
    official: "Gift Certificate Profiles",
  },
  ics_redeem_isv: { label: "Gift Certificate Redemption", official: "Gift Certificate Redemption" },
  ics_gift_card_activation: {
    label: "Gift Card Activation Service",
    official: "Gift Card Activation Service",
  },
  ics_gift_card_balance_inquiry: {
    label: "Gift Card Balance Inquiry Service",
    official: "Gift Card Balance Inquiry Service",
  },
  ics_gift_card_redemption: {
    label: "Gift Card Redemption Service",
    official: "Gift Card Redemption Service",
  },
  ics_gift_card_refund: { label: "Gift Card Refund Service", official: "Gift Card Refund Service" },
  ics_gift_card_reload: { label: "Gift Card Reload Service", official: "Gift Card Reload Service" },
  ics_gift_card_reversal: {
    label: "Gift Card Reversal Service",
    official: "Gift Card Reversal Service",
  },
  ics_gift_card_void: { label: "Gift Card Void Service", official: "Gift Card Void Service" },
  ics_gift_card_timeout_reversal: {
    label: "Gift Card Timeout Reversal Service",
    official: "Gift Card Timeout Reversal Service",
  },
  ics_ifs_setup: { label: "IFS Setup", official: "IFS Setup" },
  ics_ifs_update: { label: "IFS Update", official: "IFS Update" },
  ics_incremental_auth: {
    label: "Incremental Authorization",
    official: "Incremental Authorization",
  },
  ics_ipgeo: { label: "IP Geolocation", official: "IP Geolocation" },
  ics_oct: { label: "Original Credit Transaction", official: "Original Credit Transaction" },
  ics_pa_setup: { label: "Payer Authentication Setup", official: "Payer Authentication Setup" },
  ics_pa_enroll: {
    label: "Payer Authentication Enrollment",
    official: "Payer Authentication Enrollment",
  },
  ics_pa_validate: {
    label: "Payer Authentication Validation",
    official: "Payer Authentication Validation",
  },
  ics_authentication_exemptions: {
    label: "Visa Exemption Service",
    official: "Visa Exemption Service",
  },
  paypal_mip_agreement_ipn: {
    label: "PayPal Billing Agreement",
    official: "PayPal Billing Agreement",
  },
  ics_paypal_button_create: { label: "PayPal Button Create", official: "PayPal Button Create" },
  ics_paypal_credit: { label: "PayPal Credit", official: "PayPal Credit" },
  ics_paypal_authorization: {
    label: "PayPal Express Checkout Authorization",
    official: "PayPal Express Checkout Authorization",
  },
  ics_paypal_create_agreement: {
    label: "PayPal Express Checkout Billing Agreement Create",
    official: "PayPal Express Checkout Billing Agreement Create",
  },
  ics_paypal_update_agreement: {
    label: "PayPal Express Checkout Billing Agreement Update",
    official: "PayPal Express Checkout Billing Agreement Update",
  },
  ics_paypal_ec_order_setup: {
    label: "PayPal Express Checkout Order Setup",
    official: "PayPal Express Checkout Order Setup",
  },
  ics_paypal_auth_reversal: {
    label: "PayPal Express Checkout Auth Reversal",
    official: "PayPal Express Checkout Auth Reversal",
  },
  ics_paypal_ec_do_payment: {
    label: "PayPal Express Checkout Do Payment",
    official: "PayPal Express Checkout Do Payment",
  },
  ics_paypal_do_ref_transaction: {
    label: "PayPal Express Checkout Do Reference",
    official: "PayPal Express Checkout Do Reference",
  },
  ics_paypal_refund: {
    label: "PayPal Express Checkout Refund",
    official: "PayPal Express Checkout Refund",
  },
  ics_paypal_do_capture: {
    label: "PayPal Express Checkout Settlement",
    official: "PayPal Express Checkout Settlement",
  },
  paypal_ipn: { label: "PayPal Payment", official: "PayPal Payment" },
  ics_paypal_preapproved_payment: {
    label: "PayPal Preapproved Payment",
    official: "PayPal Preapproved Payment",
  },
  ics_pin_debit_credit: { label: "PIN Debit Credit", official: "PIN Debit Credit" },
  ics_pin_debit_purchase: { label: "PIN Debit Purchase", official: "PIN Debit Purchase" },
  ics_pin_debit_reversal: { label: "PIN Debit Reversal", official: "PIN Debit Reversal" },
  ics_timeout_pin_debit_reversal: {
    label: "PIN Debit Timeout Reversal",
    official: "PIN Debit Timeout Reversal",
  },
  ics_pinless_debit: { label: "PINless Debit", official: "PINless Debit" },
  ics_pinless_debit_validate: {
    label: "PINless Debit Validation",
    official: "PINless Debit Validation",
  },
  ics_pinless_debit_reversal: {
    label: "PINless Debit Reversal",
    official: "PINless Debit Reversal",
  },
  ics_export: { label: "Product Export Verification", official: "Product Export Verification" },
  ics_service_fee_auth: {
    label: "Service Fee Authorization",
    official: "Service Fee Authorization",
  },
  ics_service_fee_auth_reversal: {
    label: "Service Fee Authorization Reversal",
    official: "Service Fee Authorization Reversal",
  },
  ics_service_fee_bill: { label: "Service Fee Settlement", official: "Service Fee Settlement" },
  ics_service_fee_credit: {
    label: "Service Fee Credit Card Credit",
    official: "Service Fee Credit Card Credit",
  },
  ics_service_fee_ecp_credit: {
    label: "Service Fee eCheck Credit",
    official: "Service Fee eCheck Credit",
  },
  ics_service_fee_ecp_debit: {
    label: "Service Fee eCheck Debit",
    official: "Service Fee eCheck Debit",
  },
  ics_pay_subscription_create: {
    label: "Subscription Creation",
    official: "Subscription Creation",
  },
  ics_pay_subscription_create_dup: {
    label: "Subscription Creation Duplicates",
    official: "Subscription Creation Duplicates",
  },
  ics_pay_subscription_delete: { label: "Subscription Delete", official: "Subscription Delete" },
  ics_pay_subscription_update: {
    label: "Subscription Modification",
    official: "Subscription Modification",
  },
  ics_dav: { label: "Shipping Address Verification", official: "Shipping Address Verification" },
  ics_download: { label: "Software Download URL", official: "Software Download URL" },
  ics_tax: { label: "Tax Calculation", official: "Tax Calculation" },
  ics_timeout_auth_reversal: { label: "Timeout Auth Reversal", official: "Timeout Auth Reversal" },
  ics_timeout_oct_reversal: { label: "Timeout OCT Reversal", official: "Timeout OCT Reversal" },
  ics_void: { label: "Voided Transactions", official: "Voided Transactions" },
  ics_auto_void_auth_reversal: {
    label: "Authorization Reversal after Void",
    official: "Authorization Reversal after Void",
  },
  ics_pay_subscription_retrieve: {
    label: "Subscription Retrieval",
    official: "Subscription Retrieval",
  },
  ics_ap_create_mandate: {
    label: "Alt Pay Direct Debit - Create Mandate",
    official: "Alt Pay Direct Debit - Create Mandate",
  },
  ics_ap_update_mandate: {
    label: "Alt Pay Direct Debit - Update Mandate",
    official: "Alt Pay Direct Debit - Update Mandate",
  },
  ics_ap_import_mandate: {
    label: "Alt Pay Direct Debit - Import Mandate",
    official: "Alt Pay Direct Debit - Import Mandate",
  },
  ics_ap_revoke_mandate: {
    label: "Alt Pay Direct Debit - Revoke Mandate",
    official: "Alt Pay Direct Debit - Revoke Mandate",
  },
  ics_ap_mandate_status: {
    label: "Alt Pay Direct Debit - Mandate status",
    official: "Alt Pay Direct Debit - Mandate status",
  },
};

export interface InterpretedApplicationName {
  readonly name: string;
  readonly label: string;
  readonly official: string | null;
  readonly known: boolean;
}

export function interpretApplicationName(name: string | undefined): InterpretedApplicationName {
  const original = name ?? "";
  const known = APPLICATION_NAMES[original];
  if (!known) {
    return { name: original, label: original, official: null, known: false };
  }
  return { name: original, label: known.label, official: known.official, known: true };
}
