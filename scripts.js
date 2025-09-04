function renderSkills(skills, tableId, failListId) {
  const tableBody = document.getElementById(tableId);
  const failList = document.getElementById(failListId);

  if (!tableBody || !skills) return;
  tableBody.innerHTML = "";

  skills.forEach(skill => {
    const row = document.createElement("tr");

    const tdArea = document.createElement("td");
    tdArea.textContent = skill.area;

    const tdCriteria = document.createElement("td");
    const ul = document.createElement("ul");
    skill.criteria.forEach(text => {
      const li = document.createElement("li");
      li.textContent = text;
      ul.appendChild(li);
    });
    tdCriteria.appendChild(ul);

    const tdScore = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "5";
    input.required = true;

    input.addEventListener("input", () => {
      const score = parseInt(input.value, 10);
      const isFail = !isNaN(score) && score < 3;
      row.classList.toggle("fail-row", isFail);

      if (failList) {
        const allInputs = document.querySelectorAll(`#${tableId} input[type='number']`);
        failList.innerHTML = "";
        allInputs.forEach(input => {
          const inputScore = parseInt(input.value, 10);
          const thisRow = input.closest("tr");
          if (!isNaN(inputScore) && inputScore < 3) {
            const skillArea = thisRow.cells[0].textContent.trim();
            const criteriaItems = Array.from(thisRow.cells[1].querySelectorAll("li"))
              .map(li => li.textContent.trim())
              .join(", ");
            const li = document.createElement("li");
            li.textContent = `${skillArea} — ${criteriaItems}`;
            failList.appendChild(li);
          }
        });
      }
    });

    tdScore.appendChild(input);
    row.appendChild(tdArea);
    row.appendChild(tdCriteria);
    row.appendChild(tdScore);
    tableBody.appendChild(row);
  });
}

function setupFixedExpiryCalculation(assessmentId, expiryId) {
  const assessmentInput = document.getElementById(assessmentId);
  const expiryInput = document.getElementById(expiryId);

  const today = new Date().toISOString().split("T")[0];
  assessmentInput.value = today;
  assessmentInput.setAttribute("min", today);
  expiryInput.setAttribute("readonly", true);

  function updateExpiryDate() {
    const assessmentDate = new Date(assessmentInput.value);
    if (!isNaN(assessmentDate)) {
      const expiryDate = new Date(assessmentDate);
      expiryDate.setMonth(expiryDate.getMonth() + 12);
      expiryInput.value = expiryDate.toISOString().split("T")[0];
    } else {
      expiryInput.value = "";
    }
  }

  assessmentInput.addEventListener("change", updateExpiryDate);
  updateExpiryDate();
}

function initSignaturePad(canvasId) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let drawing = false;

  function getPosition(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.touches ? e.touches[0].clientX : e.clientX) - rect.left,
      y: (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    };
  }

  function startDrawing(e) {
    drawing = true;
    ctx.beginPath();
    const pos = getPosition(e);
    ctx.moveTo(pos.x, pos.y);
  }

  function draw(e) {
    if (!drawing) return;
    const pos = getPosition(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function stopDrawing() {
    drawing = false;
  }

  canvas.addEventListener("mousedown", startDrawing);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stopDrawing);
  canvas.addEventListener("mouseout", stopDrawing);
  canvas.addEventListener("touchstart", startDrawing);
  canvas.addEventListener("touchmove", draw);
  canvas.addEventListener("touchend", stopDrawing);
}

function clearSignatures() {
  ["assessorSign", "assesseeSign"].forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  });
}

function isCanvasSigned(canvas) {
  const context = canvas.getContext('2d');
  const blank = document.createElement('canvas');
  blank.width = canvas.width;
  blank.height = canvas.height;
  return canvas.toDataURL() !== blank.toDataURL();
}

function saveHTMLAndLocal() {
  const form = document.getElementById("competencyForm");
  const formData = new FormData(form);
  const get = (key) => formData.get(key) || "";

  const escapeHTML = str => str.replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const staffNameRaw = get("staffName");
  const staffName = staffNameRaw ? staffNameRaw.replace(/\s+/g, "_") : "form";
  const date = new Date().toISOString().split("T")[0];

  let output = `
    <h1>Competency Assessment Summary</h1>

    <h2>Carer Details</h2>
    <table>
      <tr><th>Carer Name</th><td>${get("staffName")}</td></tr>
      <tr><th>Client Name</th><td>${get("clientName")}</td></tr>
      <tr><th>Nurse Assessor</th><td>${get("nurseAssessorName")}</td></tr>
      <tr><th>Assessment Type</th><td>${get("assessmentType")}</td></tr>
      <tr><th>Assessment Date</th><td>${get("assessmentDate")}</td></tr>
      <tr><th>Expiry Date</th><td>${get("expiryDate")}</td></tr>
    </table>

    <h2>Assessment Scores</h2>
    <table>
      <tr><th>Skill Area</th><th>Criteria</th><th>Score</th></tr>
  `;

  const rows = document.querySelectorAll("#competency-body tr");
  rows.forEach(row => {
    const cells = row.querySelectorAll("td");
    if (cells.length === 3) {
      output += `
        <tr>
          <td>${cells[0].innerText}</td>
          <td>${cells[1].innerText}</td>
          <td>${cells[2].querySelector("input")?.value || ""}</td>
        </tr>
      `;
    }
  });

  output += `</table>`;

  output += `
    <h2>Confirmation</h2>
    <p><strong>SOP Confirmed:</strong> ${document.getElementById("sop-confirmation").checked ? "Yes" : "No"}</p>
    <p><strong>Assessor Feedback:</strong></p>
    <p>${escapeHTML(get("assessorFeedback")).replace(/\n/g, "<br>")}</p>
  `;

  const getSignatureImage = (id) => {
    const canvas = document.getElementById(id);
    if (canvas) {
      return `<img src="${canvas.toDataURL()}" alt="${id} Signature" style="border:1px solid #ccc; width:300px; height:100px;">`;
    }
    return "<p>No signature</p>";
  };

  output += `
    <h2>Signatures</h2>
    <h3>Assessor</h3>
    ${getSignatureImage("assessorSign")}
    <h3>Assessee</h3>
    ${getSignatureImage("assesseeSign")}
  `;

  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Competency Assessment: ${get("staffName")}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 2rem;
          line-height: 1.6;
          color: #333;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 1.5rem;
        }
        th, td {
          border: 1px solid #ccc;
          padding: 0.5rem;
          text-align: left;
        }
        th {
          background-color: #f2f2f2;
        }
        h1, h2 {
          color: #003366;
        }
      </style>
    </head>
    <body>
      ${output}
    </body>
    </html>
  `;

  const blob = new Blob([fullHtml], { type: "text/html" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `Competency_${staffName}_${date}.html`;
  link.click();
}
