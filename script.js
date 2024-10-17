// Function to handle university selection
function setupUniversitySelection() {
    const universityBoxes = document.querySelectorAll(".university-box");

    universityBoxes.forEach(box => {
        box.addEventListener("click", () => {
            universityBoxes.forEach(b => b.classList.remove("selected"));
            box.classList.add("selected");
        });
    });
}

// Function to get the selected university
function getSelectedUniversity() {
    const selectedUniversity = document.querySelector(".university-box.selected");
    return selectedUniversity ? selectedUniversity.textContent : null;
}

// Function to handle file upload changes
function handleFileUpload(event) {
    const fileInput = event.target;
    const file = fileInput.files[0];

    if (file) {
        console.log("File selected:", file.name);
    } else {
        console.log("No file selected.");
    }
}

// Function to fetch the OpenAI API key
async function fetchOpenAIKey(phpFilePath = "openai.php") {
    try {
        const response = await fetch(phpFilePath, { method: "GET" });

        if (!response.ok) {
            throw new Error("Key Not Fetched");
        }

        const data = await response.json();
        const apiKey = data[0]?.value;

        if (!apiKey) {
            throw new Error("API key not found in the response");
        }

        console.log("Fetched API Key:", apiKey);
        return apiKey;
    } catch (error) {
        console.error("Error fetching API key:", error);
        throw new Error("Failed to fetch the OpenAI API key.");
    }
}

async function generateExamPreview(apiKey, formData, maxRetries = 3) {
    let retryCount = 0;

    while (retryCount < maxRetries) {
        try {
            const requestBody = {
                model: "gpt-3.5 turbo",
                messages: [
                    {
                        role: "system",
                        content: "You are an AI assistant that generates exam questions based on the subject and difficulty level provided. Use the example content provided from the uploaded file to match the question difficulty but do not directly base questions on the content."
                    },
                    {
                        role: "user",
                        content: `Create an exam for the subject "${formData.examName}" based on the following specifications:
                        - ${formData.numMultipleChoice} multiple-choice questions
                        - ${formData.numFillInTheBlanks} fill-in-the-blank questions
                        - ${formData.numTrueFalse} true/false questions
                        - ${formData.examDuration} open-ended questions.

                        The content in the uploaded file is provided as an example to help you understand the level of difficulty of the questions that should be generated, but do not generate questions directly from the content.

                        Example content:
                        \n\n${formData.fileContent}\n\n
                        Ensure that the questions match the difficulty level expected at "${formData.university || "a typical university"}".`
                    }
                ],
                max_tokens: 4000 // Ensure this doesn't exceed the API's token limit
            };

            console.log("Sending request to OpenAI...");
            const response = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response text:", errorText);
                throw new Error(`Failed to generate exam. Status: ${response.status} - ${response.statusText}`);
            }

            const data = await response.json();
            const rawContent = data.choices[0].message.content.trim();
            console.log("Received response from OpenAI:", rawContent);

            // Try to extract JSON from the response
            try {
                const jsonResponse = JSON.parse(rawContent); // Attempt to parse as JSON directly
                console.log("Parsed exam data:", jsonResponse);
                return jsonResponse;
            } catch (jsonError) {
                console.warn("Response is not in JSON format, treating as plain text:", rawContent);
                return rawContent; // Return the raw text if not JSON
            }
        } catch (error) {
            console.error(`Retry ${retryCount + 1} failed:`, error);
            retryCount++;
        }
    }

    throw new Error("Failed to generate exam preview after multiple retries.");
}

// Function to show the exam preview in a modal
function showExamPreviewModal(examData) {
    let content = '';

    if (typeof examData === 'string') {
        // Handle plain text response
        content = examData;
    } else if (Array.isArray(examData.questions)) {
        // Handle JSON response with questions array
        const questions = examData.questions;
        questions.forEach((question, index) => {
            content += `Q${index + 1}: ${question.question}\n`;
            if (question.options && question.options.length) {
                question.options.forEach((option, i) => {
                    content += `${String.fromCharCode(65 + i)}. ${option}\n`;
                });
            }
            content += `Answer: ${question.answer}\n\n`;
        });
    } else {
        console.error("Invalid exam data format.");
        alert("Failed to load exam questions.");
        return;
    }

    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal-content">
                <h2>Exam Preview</h2>
                <pre id="exam-preview-content">${content}</pre>
                <div class="modal-buttons">
                    <button id="close-modal" onclick="window.closeModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
}

// Function to submit the exam form
async function submitExamForm(event) {
    event.preventDefault(); // Prevent page reload

    // Show the spinner
    showSpinner();

    const formData = {
        examName: document.getElementById("exam-name").value,
        numMultipleChoice: parseInt(document.getElementById("multiple-choice").value, 10),
        numFillInTheBlanks: parseInt(document.getElementById("fill-blanks").value, 10),
        numTrueFalse: parseInt(document.getElementById("true-false").value, 10),
        examDuration: parseInt(document.getElementById("exam-duration").value, 10),
        hardnessLevel: document.getElementById("hardness-level").value,
        university: getSelectedUniversity(),
        fileContent: await getFileContent()
    };

    console.log("Form data being sent:", formData);

    try {
        const apiKey = await fetchOpenAIKey();
        const examPreview = await generateExamPreview(apiKey, formData);
        showExamPreviewModal(examPreview);
        console.log("Exam preview generated:", examPreview);
    } catch (error) {
        console.error("Error submitting form:", error);
        alert("Failed to generate exam. Please try again.");
    } finally {
        hideSpinner(); // Hide the spinner once done
    }
}

// Function to show the loading spinner
function showSpinner() {
    const spinnerHtml = `
        <div class="spinner-overlay">
            <div class="spinner"></div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", spinnerHtml);
}

// Function to hide the loading spinner
function hideSpinner() {
    const spinnerOverlay = document.querySelector(".spinner-overlay");
    if (spinnerOverlay) {
        spinnerOverlay.remove();
    }
}

// Initialize the functionality when the document is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    setupUniversitySelection();

    const examForm = document.querySelector(".exam-form");
    if (examForm) {
        examForm.addEventListener("submit", submitExamForm);
    }
});

// Configure the pdf.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.10.377/pdf.worker.min.js';

// Handle file upload and extract the content
async function handleFileUpload(event) {
    extractedFileContent = await getFileContent();
    console.log("Extracted file content:", extractedFileContent);
}

// Function to extract PDF content using pdf.js
async function getFileContent() {
    const fileInput = document.getElementById("file-upload");
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];

        if (file.size > 2 * 1024 * 1024) {
            alert("The file is too large. Please upload a file smaller than 2MB.");
            return null;
        }

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            let pdfText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                pdfText += pageText + '\n';
            }

            console.log("Extracted PDF text:", pdfText);

            const limitedContent = pdfText.slice(0, 1000); // Limit content for API request
            return limitedContent;
        } catch (error) {
            console.error("Error extracting PDF content:", error);
            alert("Failed to extract text from the PDF.");
            return null;
        }
    } else {
        console.log("No file selected.");
        return null;
    }
}
