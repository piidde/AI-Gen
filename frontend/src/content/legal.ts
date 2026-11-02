// Terms of service and privacy notice. DRAFT written from the implemented
// service (docs/DATA.md, docs/SECURITY.md, docs/BILLING.md) and not yet reviewed
// by a lawyer. The operator contracts from Australia through an Australian Stripe
// account, so Australian law governs; EU/UK consumer protections and the GDPR still
// apply to customers there. Operator identity lives only in the legal notice on the
// contact page, and the upstream provider is deliberately not named.

export type LegalBlock = string | { list: string[] } | { subheading: string };
export type LegalSection = { id: string; heading: string; blocks: LegalBlock[] };

export const legalUpdatedOn = "2026-10-27";

const contactPoint = "the contact details in the legal notice on our contact page (aiapi.deals/contact)";

export const termsSections: LegalSection[] = [
  {
    id: "scope",
    heading: "1. Scope",
    blocks: [
      "These terms apply to all contracts between the operator of AIAPI.deals (\"we\", \"us\") and our customers (\"you\") for the use of AIAPI.deals. The operator is named in the legal notice on our contact page. These terms apply to consumers and businesses alike unless a clause says otherwise. A consumer is anyone who uses the service mainly for personal purposes, outside their trade, business or profession.",
      "Terms of business customers that differ from these terms do not apply, even if we do not object to them.",
    ],
  },
  {
    id: "service",
    heading: "2. The service",
    blocks: [
      "AIAPI.deals gives you API access to image and text models. You call the API from your own application, scripts or tools. There is no chat or image generator on this website.",
      "The models are developed by third parties such as OpenAI and Google and are provided to us through infrastructure partners. We are not affiliated with the model developers. Which models are available, and at what price, is shown on our models page. Models can be added, changed or removed, and individual models can be temporarily unavailable.",
    ],
  },
  {
    id: "account",
    heading: "3. Your account and API keys",
    blocks: [
      "You need an account to buy credits and create API keys. You must be at least 18 years old and give accurate information.",
      "Keep your password and API keys secret. Requests made with your keys are charged to your balance. If you suspect that a key has been misused, revoke it in your dashboard right away and tell us.",
    ],
  },
  {
    id: "contract",
    heading: "4. How a purchase works",
    blocks: [
      "Creating an account is free. To buy credits, choose a credit package in your dashboard. You are then taken to the checkout of our payment provider Stripe, where you can review your order and correct any input errors before paying. By clicking the payment button you make a binding offer to buy the selected package. The contract is concluded when we confirm the payment and add the credits to your balance.",
      "The contract language is English. We do not keep a copy of the contract text for you. You can save or print these terms, and you receive a payment receipt from Stripe.",
    ],
  },
  {
    id: "prices",
    heading: "5. Prices and payment",
    blocks: [
      "Package prices are shown in the dashboard and at checkout in USD or EUR. Any tax we must charge, such as GST or VAT, is shown at checkout before you pay.",
      "Payment is processed by Stripe with the payment methods offered at checkout. There is no subscription and no automatic renewal.",
    ],
  },
  {
    id: "credits",
    heading: "6. Credits and usage prices",
    blocks: [
      "Credits are a prepaid balance for using the API. Purchased credits never expire. Some packages include bonus credits; bonus credits are used like other credits but are not refunded.",
      "The usage price of each model is shown on the models page, per request for image models and per 1 million tokens for text models. Usage prices can change at any time, for example when our infrastructure partners change their prices. A request is always charged at the price in force when we accepted it.",
      "When you send a request, we reserve credits for its expected cost. After the request, we charge the actual cost, at most the reserved amount, and release the rest.",
    ],
  },
  {
    id: "requests",
    heading: "7. Failed requests",
    blocks: [
      "If a request fails and we were charged nothing for it, the reserved credits are returned to your balance.",
      "If a model's content policy rejects your request and we are charged for that rejection, the request stays charged.",
      "If the outcome of a request stays unknown, we release the reserved credits after 24 hours. Check the request in your dashboard before sending it again, so you do not pay twice.",
    ],
  },
  {
    id: "withdrawal",
    heading: "8. Right of withdrawal for EU and UK consumers",
    blocks: [
      "If you are a consumer living in the European Union or the United Kingdom, you have the following right of withdrawal. Australian law does not give a general right to cancel online purchases, so this section does not apply to other customers.",
      { subheading: "Right of withdrawal" },
      "You have the right to withdraw from this contract within 14 days without giving any reason. The withdrawal period will expire after 14 days from the day of the conclusion of the contract.",
      `To exercise the right of withdrawal, you must inform us, using ${contactPoint}, of your decision to withdraw from this contract by an unequivocal statement, for example a letter sent by post or an email. You may use the model withdrawal form below, but it is not obligatory.`,
      "To meet the withdrawal deadline, it is sufficient for you to send your communication concerning your exercise of the right of withdrawal before the withdrawal period has expired.",
      { subheading: "Effects of withdrawal" },
      "If you withdraw from this contract, we shall reimburse to you all payments received from you without undue delay and in any event not later than 14 days from the day on which we are informed about your decision to withdraw from this contract. We will carry out such reimbursement using the same means of payment as you used for the initial transaction, unless you have expressly agreed otherwise; in any event, you will not incur any fees as a result of such reimbursement.",
      "If you requested to begin the performance of services during the withdrawal period, you shall pay us an amount which is in proportion to what has been provided until you have communicated to us your withdrawal from this contract, in comparison with the full coverage of the contract.",
      { subheading: "Early expiry" },
      "Your right of withdrawal expires early when we have fully provided the service, that is when all credits from the purchase have been used, if you expressly agreed before the start that we begin before the end of the withdrawal period and confirmed that you lose your right of withdrawal once the contract has been fully performed.",
      { subheading: "Model withdrawal form" },
      "(Complete and return this form only if you wish to withdraw from the contract.) To the operator of AIAPI.deals, at the address or email in our legal notice: I/We (*) hereby give notice that I/We (*) withdraw from my/our (*) contract for the provision of the following service: purchase of credits (order ID). Ordered on (*): Name of consumer(s): Address of consumer(s): Signature of consumer(s) (only if this form is notified on paper): Date: (*) Delete as appropriate.",
    ],
  },
  {
    id: "use",
    heading: "9. Acceptable use",
    blocks: [
      "You may build the API into your own products and services. You may not:",
      { list: [
        "create or distribute illegal content, or content that sexualises minors;",
        "infringe the rights of others, including copyrights, trademarks and personality rights;",
        "violate the usage policies of the model developers, such as OpenAI and Google;",
        "share your API keys with others or resell direct access to our API;",
        "get around rate limits, billing or other technical limits, or attack our systems.",
      ] },
      "If we have concrete indications of a violation, we may block affected API keys or suspend your account. We will tell you, as far as legally permitted, and you can respond.",
    ],
  },
  {
    id: "content",
    heading: "10. Your inputs and outputs",
    blocks: [
      "You are responsible for the inputs you send and for how you use the outputs. We claim no rights to your inputs or outputs.",
      "Outputs are generated by AI models and can be wrong, incomplete or similar to the outputs of other users. Check them before you rely on them.",
      "We do not store outputs permanently. Generated files can be downloaded for a limited time, currently two hours, and are then deleted. Save the results you want to keep.",
    ],
  },
  {
    id: "availability",
    heading: "11. Availability",
    blocks: [
      "We work to keep the service available but cannot guarantee uninterrupted operation. Maintenance, faults at our infrastructure partners or changes by the model developers can cause interruptions. Current incidents are listed on our status page.",
    ],
  },
  {
    id: "liability",
    heading: "12. Liability",
    blocks: [
      "Our services come with guarantees that cannot be excluded under the Australian Consumer Law. Nothing in these terms excludes, restricts or modifies any right or remedy you have under the Australian Consumer Law or under other law that cannot be excluded, including the mandatory consumer law of the country where you live.",
      "Where the law allows us to limit our liability for a breach of such a guarantee, and the service is not of a kind ordinarily acquired for personal, domestic or household use, our liability is limited to supplying the service again or paying the cost of having it supplied again.",
      "Subject to the paragraphs above, we are not liable for indirect or consequential loss, such as lost profits or lost data, and our total liability is limited to the amount you paid us in the 12 months before the event that caused the claim. These limits do not apply to death or personal injury, fraud, or loss we cause intentionally or through gross negligence.",
    ],
  },
  {
    id: "deletion",
    heading: "13. Termination and account deletion",
    blocks: [
      "You can end the contract at any time by asking us to delete your account. Deleting your account ends your API access. Unused credits, including bonus credits, are forfeited when you delete your account and are not refunded. We tell you your remaining balance before we delete the account.",
      "We can end the contract with 30 days' notice. In that case we refund the value of purchased credits you have not used; bonus credits are not refunded. We can also end the contract without notice for good cause, for example a serious violation of section 9.",
      "A withdrawal under section 8 and your rights under the Australian Consumer Law are not affected.",
    ],
  },
  {
    id: "changes",
    heading: "14. Changes to these terms",
    blocks: [
      "We may change these terms with effect for the future, for example when the law or our service changes. We will tell you about changes by email at least 30 days before they take effect. If you do not object before then, the new terms apply; we will point this out in the notice. If you object, we end the contract under section 13 as if we had given notice, and refund your unused purchased credits.",
    ],
  },
  {
    id: "final",
    heading: "15. Final provisions",
    blocks: [
      "These terms are governed by the laws in force in Australia, excluding the UN Convention on Contracts for the International Sale of Goods. If you are a consumer living outside Australia, this choice of law does not deprive you of the protection of the mandatory law of the country where you live, and you can also bring a claim in the courts there.",
      "If you are a business customer, the courts of Australia have jurisdiction.",
      "If a clause of these terms is invalid, the rest of the terms remain valid.",
    ],
  },
];

export const privacySections: LegalSection[] = [
  {
    id: "controller",
    heading: "1. Who is responsible",
    blocks: [
      `AIAPI.deals is operated from Australia. The operator is responsible for the processing of personal data on this website and in our API. You can reach us through ${contactPoint}.`,
      "This notice is written to meet the EU General Data Protection Regulation (GDPR) for customers in the European Union and the Australian Privacy Principles under the Privacy Act 1988.",
    ],
  },
  {
    id: "website",
    heading: "2. Visiting the website",
    blocks: [
      "When you visit the website, your browser sends technical data such as your IP address, the date and time, the page requested and your browser type. We need this data to deliver the website and protect it against attacks. Legal basis: Art. 6(1)(f) GDPR, our legitimate interest in a secure, working website.",
      "The website and API run on Cloudflare (Cloudflare, Inc., USA). Cloudflare processes this data on our behalf and keeps it only as long as needed for delivery and security. Cloudflare is certified under the EU-US Data Privacy Framework.",
    ],
  },
  {
    id: "account-data",
    heading: "3. Your account",
    blocks: [
      "To create an account we process your email address, your password (stored only as a hash), your sign-in method and your account settings. Sign-in and the database run on Supabase (Supabase, Inc., USA) in a data centre in Frankfurt, Germany, under standard contractual clauses. Legal basis: Art. 6(1)(b) GDPR, the performance of our contract with you.",
      "If you sign in with Google or Discord, that provider sends us your email address and basic profile data. Its own privacy policy applies to the sign-in itself.",
      "In your billing profile you can optionally add a billing name, company, address, country and VAT ID. We use this only for payments and support.",
    ],
  },
  {
    id: "api",
    heading: "4. Using the API",
    blocks: [
      "For each request we store what we need for usage, billing and support: request ID, time, model, status, token or request counts, cost and the API key used. Legal basis: Art. 6(1)(b) GDPR.",
      "Your prompts, input files and outputs are passed to the infrastructure partners that run the model you choose, and from there to the developer of that model, such as OpenAI or Google. These recipients can be located outside the European Union and Australia. Where personal data leaves the European Union, we use the safeguards the GDPR requires, such as standard contractual clauses.",
      "We do not log prompts or outputs. Input files are stored encrypted only until the request has been handed over. Generated files are stored for up to two hours so you can download them, and are then deleted.",
      "To prevent abuse, we use your IP address and API key for rate limits. Legal basis: Art. 6(1)(f) GDPR, our legitimate interest in a stable service.",
      "Please do not send personal data of other people in prompts unless you are allowed to.",
    ],
  },
  {
    id: "payments",
    heading: "5. Payments",
    blocks: [
      "Payments are processed by Stripe (Stripe Payments Australia Pty Ltd). Stripe receives your payment details directly; we never see your full card details. From Stripe we receive the payment status, the amount and a link to your receipt. Legal basis: Art. 6(1)(b) GDPR, and Art. 6(1)(c) GDPR for keeping records required by tax law.",
    ],
  },
  {
    id: "emails",
    heading: "6. Emails",
    blocks: [
      "We send emails you need for your account, such as sign-up confirmation and password resets, through Supabase. If you switch on low-balance alerts, we send them from alerts@aiapi.deals through Cloudflare. Legal basis: Art. 6(1)(b) GDPR.",
      "Product updates are sent only if you switch them on in your settings. You can switch them off at any time. Legal basis: Art. 6(1)(a) GDPR, your consent.",
    ],
  },
  {
    id: "monitoring",
    heading: "7. Error monitoring",
    blocks: [
      "To find and fix errors we can use Sentry (Functional Software, Inc., USA). Error reports contain technical data such as request IDs and error codes, but no request bodies, cookies or credentials. Legal basis: Art. 6(1)(f) GDPR, our legitimate interest in a working service.",
    ],
  },
  {
    id: "storage",
    heading: "8. Cookies and local storage",
    blocks: [
      "We store a few necessary entries in your browser: your sign-in session, your cookie choice and which announcements you have seen. They are needed for the service you request. Legal basis: § 25(2) no. 2 TDDDG and Art. 6(1)(f) GDPR.",
      "With your consent we use Google Analytics 4 (Google Ireland Limited) to understand how the website is used. Google Analytics loads only after you accept analytics. It sets cookies and processes pseudonymous usage data, which can be transferred to Google LLC in the USA; Google is certified under the EU-US Data Privacy Framework. Legal basis: § 25(1) TDDDG and Art. 6(1)(a) GDPR. You can change your choice at any time below.",
    ],
  },
  {
    id: "retention",
    heading: "9. How long we keep data",
    blocks: [
      { list: [
        "Account data: until you delete your account.",
        "Request records: as long as we need them for billing, support and security, and no longer than your account exists, unless tax law requires us to keep billing entries.",
        "Payment records: as long as tax law requires, which in Australia is at least five years.",
        "Input files: until the request has been handed over, at most three days.",
        "Generated files: up to two hours.",
      ] },
    ],
  },
  {
    id: "rights",
    heading: "10. Your rights",
    blocks: [
      "You have the right to access and correct your personal data. Under the GDPR you also have the right to erasure, restriction of processing and data portability. You can withdraw any consent at any time with effect for the future.",
      "Right to object: where we process data based on Art. 6(1)(f) GDPR, you can object at any time for reasons arising from your particular situation.",
      `To use these rights or to make a privacy complaint, contact us through ${contactPoint}. We will answer within 30 days. If you are not satisfied, you can complain to the Office of the Australian Information Commissioner (oaic.gov.au) or, in the European Union, to a data protection supervisory authority.`,
      "You do not have to provide personal data, but without an email address we cannot create an account for you. We do not use automated decision-making.",
    ],
  },
];
