(function () {
    "use strict";

    const form = document.getElementById("automationAssessment");
    if (!form) return;

    const steps = Array.from(form.querySelectorAll("[data-step]"));
    const progress = Array.from(form.querySelectorAll("[data-progress]"));
    const back = document.getElementById("assessmentBack");
    const next = document.getElementById("assessmentNext");
    const submit = document.getElementById("assessmentSubmit");
    const error = document.getElementById("assessmentError");
    const result = document.getElementById("assessmentResult");
    let currentStep = 0;

    function showStep(index) {
        currentStep = index;
        steps.forEach((step, stepIndex) => { step.hidden = stepIndex !== index; });
        progress.forEach((item, stepIndex) => {
            item.classList.toggle("is-active", stepIndex === index);
            item.classList.toggle("is-complete", stepIndex < index);
        });
        back.hidden = index === 0;
        next.hidden = index === steps.length - 1;
        submit.hidden = index !== steps.length - 1;
        error.hidden = true;
        steps[index].querySelector("legend")?.focus?.();
    }

    function validateStep() {
        const fields = Array.from(steps[currentStep].querySelectorAll("input[required], textarea[required]"));
        const invalid = fields.find((field) => !field.checkValidity());
        if (invalid) {
            invalid.reportValidity();
            error.textContent = "Complete the highlighted field before continuing.";
            error.hidden = false;
            return false;
        }
        error.hidden = true;
        return true;
    }

    next.addEventListener("click", () => { if (validateStep()) showStep(currentStep + 1); });
    back.addEventListener("click", () => showStep(currentStep - 1));

    const sensitiveBoxes = Array.from(form.querySelectorAll('input[name="sensitive"]'));
    sensitiveBoxes.forEach((box) => box.addEventListener("change", () => {
        if (!box.checked) return;
        if (box.value === "none") sensitiveBoxes.filter((item) => item !== box).forEach((item) => { item.checked = false; });
        else sensitiveBoxes.filter((item) => item.value === "none").forEach((item) => { item.checked = false; });
    }));

    function text(value) {
        return String(value || "").trim();
    }

    function escapeHtml(value) {
        return text(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character]);
    }

    function listFromText(value) {
        return text(value).split(/\n|→|->|;|\.(?=\s+[A-Z])/).map((item) => item.replace(/^\d+[.)]\s*/, "").trim()).filter(Boolean);
    }

    function analyse(data) {
        const combined = `${data.process} ${data.steps} ${data.judgement} ${data.outcome}`.toLowerCase();
        const applications = text(data.applications).split(",").map((item) => item.trim()).filter(Boolean);
        const sensitive = data.sensitive;
        const consequential = /approve|reject|diagnos|medical|clinical|legal|credit|fraud|payment|refund|hire|fire|eligib|safety|prescri/.test(combined) || sensitive.includes("health") || sensitive.includes("financial");
        const unstructured = /email|document|pdf|message|text|classif|extract|summari|draft|research|triage|interpret/.test(combined);
        const repetitive = Number(data.frequency) >= 20;
        const integrationComplexity = applications.length >= 4 ? 2 : applications.length >= 2 ? 1 : 0;
        const sensitivePenalty = sensitive.filter((item) => item !== "none").length > 0 ? 8 : 0;
        const humanPenalty = consequential ? 12 : 0;
        const basePotential = repetitive ? 82 : 70;
        const automationPercentage = Math.max(35, Math.min(85, basePotential - humanPenalty - sensitivePenalty + (unstructured ? -3 : 3)));
        const score = Math.max(30, Math.min(92, automationPercentage - integrationComplexity * 3 + (Number(data.frequency) >= 80 ? 4 : 0)));
        const currentHours = Number(data.frequency) * Number(data.minutes) * Number(data.people) / 60;
        const recoveredHours = currentHours * automationPercentage / 100;
        const monthlyValue = text(data.hourlyCost) ? recoveredHours * Number(data.hourlyCost) : null;
        const complexity = consequential || sensitivePenalty || integrationComplexity === 2 ? "High" : integrationComplexity === 1 || unstructured ? "Medium" : "Low";
        const potential = score >= 75 ? "Strong opportunity" : score >= 55 ? "Promising with controls" : "Selective automation only";
        const approach = [
            "A deterministic workflow orchestrator for triggers, validation, retries and system updates",
            unstructured ? "Bounded AI for extracting or classifying unstructured information into a strict schema" : "Rule-based logic for known decisions and data transformations",
            consequential ? "Explicit human approval before any consequential or irreversible action" : "Human review for exceptions and low-confidence cases",
            "An audit trail, idempotency keys, monitoring and a recoverable failure queue"
        ];
        const automatable = ["Input capture and validation", "Routine data lookup and movement", unstructured ? "Structured extraction and draft preparation" : "Rules-based routing and updates", "Logging, reminders and operational reporting"];
        const human = consequential ? ["Final consequential decisions", "Ambiguous or low-confidence cases", "Policy exceptions and failure recovery"] : ["Ambiguous exceptions", "Quality sampling during rollout", "Policy changes and unresolved failures"];
        const risks = [
            applications.length ? `API access, permissions and rate limits for ${applications.join(", ")} must be verified.` : "The integration path still needs verification.",
            "Duplicate or partial runs could create inconsistent downstream state without idempotency and reconciliation.",
            unstructured ? "AI interpretation can be wrong or overconfident; outputs need schemas, thresholds and evidence." : "Input quality and undocumented rules may create incorrect routing."
        ];
        if (sensitivePenalty) risks.unshift(`The workflow includes ${sensitive.filter((item) => item !== "none").join(", ")} information, requiring minimisation, access control and a defined retention policy.`);
        return { applications, consequential, unstructured, automationPercentage, score, currentHours, recoveredHours, monthlyValue, complexity, potential, approach, automatable, human, risks };
    }

    function money(value) {
        return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 }).format(value);
    }

    function bullets(items) {
        return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
    }

    form.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!validateStep()) return;
        const values = new FormData(form);
        const data = Object.fromEntries(values.entries());
        data.sensitive = values.getAll("sensitive");
        const assessment = analyse(data);
        const valueCard = assessment.monthlyValue === null
            ? `<strong>Not calculated</strong><span>No cost supplied</span>`
            : `<strong>${money(assessment.monthlyValue)}</strong><span>potential monthly capacity value</span>`;
        const subject = encodeURIComponent(`Automation Sprint request: ${text(data.process).slice(0, 70)}`);
        const body = encodeURIComponent(`Hi Pierre-Henry,\n\nI completed the Automation Opportunity Assessment.\n\nBusiness: ${data.business}\nProcess: ${data.process}\nApplications: ${data.applications}\nCurrent effort: ${assessment.currentHours.toFixed(1)} hours/month\nPreliminary potential: ${assessment.potential} (${assessment.score}/100)\n\nI would like to discuss whether this is suitable for an Automation Sprint.`);
        result.innerHTML = `
            <div class="result-heading">
                <div><p class="eyebrow">Preliminary assessment</p><h2>${escapeHtml(assessment.potential)}</h2><p>This is a directional system assessment based only on your answers. Integration capabilities, business rules and data constraints still require discovery.</p></div>
                <div class="score-block"><strong>${assessment.score}</strong><span>/ 100</span><small>automation potential</small></div>
            </div>
            <div class="value-grid">
                <div><strong>${assessment.currentHours.toFixed(1)} hrs</strong><span>current effort / month</span></div>
                <div><strong>${assessment.recoveredHours.toFixed(1)} hrs</strong><span>potentially recoverable / month</span></div>
                <div>${valueCard}</div>
                <div><strong>${escapeHtml(assessment.complexity)}</strong><span>indicative complexity</span></div>
            </div>
            <div class="result-grid">
                <article><p class="result-number">01</p><h3>Likely approach</h3>${bullets(assessment.approach)}</article>
                <article><p class="result-number">02</p><h3>What could be automated</h3>${bullets(assessment.automatable)}</article>
                <article><p class="result-number">03</p><h3>What should remain human</h3>${bullets(assessment.human)}</article>
                <article><p class="result-number">04</p><h3>Risks to resolve</h3>${bullets(assessment.risks)}</article>
            </div>
            <div class="result-next">
                <div><p class="eyebrow eyebrow-light">Potential next step</p><h3>${assessment.score >= 55 ? "Validate the workflow in an Opportunity Audit." : "Narrow the workflow before commissioning a build."}</h3><p>${assessment.score >= 55 ? "Confirm the real process, API access, exception rate and acceptance criteria. If the evidence holds, define a fixed-price Automation Sprint." : "The current description suggests targeted assistance may create more value than end-to-end automation."}</p></div>
                <a class="button button-light" href="mailto:pierre@pierrehenry.dev?subject=${subject}&body=${body}">Request an Automation Sprint</a>
            </div>
            <p class="result-disclaimer">The recoverable percentage is a preliminary engineering heuristic, not guaranteed ROI. Financial value appears only when you supplied an hourly cost.</p>`;
        result.hidden = false;
        result.focus();
    });

    document.getElementById("copyrightYear").textContent = new Date().getFullYear();
    showStep(0);
})();
