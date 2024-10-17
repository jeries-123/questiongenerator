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
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an AI assistant that generates exam questions based on the subject and difficulty level provided. Always return the result in valid JSON format."
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
                        
                        Ensure that the questions match the difficulty level expected at "${formData.university || "a typical university"}". Format the output as valid JSON with the following structure:

                        {
                            "questions": [
                                {
                                    "question": "string",
                                    "options": ["option1", "option2", "option3", "option4"],
                                    "answer": "correct answer"
                                }
                            ]
                        }`
                    }
                ],
                max_tokens: 4000
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

            // Try to parse the response as JSON
            try {
                const jsonResponse = JSON.parse(rawContent);
                console.log("Parsed exam data:", jsonResponse);
                return jsonResponse;
            } catch (jsonError) {
                console.warn("Response is not in JSON format, treating as plain text:", rawContent);
                return rawContent; // Return
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
    if (typeof examData === 'string') {
        // Handle plain text response
        console.warn("Received plain text response instead of JSON.");
        alert("The exam preview is not in the expected format. Please check.");
        return;
    }

    const questions = examData.questions;
    let currentQuestionIndex = 0;

    // Function to update the modal view with the current question
    function updateQuestionView() {
        const currentQuestion = questions[currentQuestionIndex];
        const questionText = currentQuestion.question;
        const answerText = currentQuestion.answer;
        const options = currentQuestion.options || [];

        let content = `Q: ${questionText}\n`;
        if (options.length > 0) {
            options.forEach((option, index) => {
                content += `${String.fromCharCode(65 + index)}. ${option}\n`;
            });
        }
        content += `Answer: ${answerText}`;

        const questionContent = document.querySelector("#question-content");
        if (questionContent) {
            questionContent.value = content;
        }

        document.querySelector("#question-number").textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    }

    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal-content">
                <h2>Exam Preview</h2>
                <div class="question-navigation">
                    <button id="prev-question">Previous</button>
                    <span id="question-number">Question 1 of ${questions.length}</span>
                    <button id="next-question">Next</button>
                </div>
                <textarea id="question-content" class="question-content" placeholder="Edit the question, options, and answer..."></textarea>
                <div class="modal-buttons">
                    <button id="close-modal">Close</button>
                    <button id="finalize-exam">Finalize</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Update the first question
    updateQuestionView();

    // Attach event listeners to buttons
    document.getElementById("prev-question").addEventListener("click", () => {
        if (currentQuestionIndex > 0) {
            saveCurrentQuestion();
            currentQuestionIndex--;
            updateQuestionView();
        }
    });

    document.getElementById("next-question").addEventListener("click", () => {
        if (currentQuestionIndex < questions.length - 1) {
            saveCurrentQuestion();
            currentQuestionIndex++;
            updateQuestionView();
        }
    });

    document.getElementById("close-modal").addEventListener("click", () => {
        document.querySelector(".modal-overlay").remove();
    });

    document.getElementById("finalize-exam").addEventListener("click", () => {
        saveCurrentQuestion();
        alert("Exam finalized! You can now use the edited content.");
        document.querySelector(".modal-overlay").remove();
    });

    // Function to save the current question's edits
    function saveCurrentQuestion() {
        const currentQuestion = questions[currentQuestionIndex];
        const content = document.querySelector("#question-content").value;

        const lines = content.split("\n");
        currentQuestion.question = lines[0].replace(/^Q:\s*/, '').trim();
        currentQuestion.options = [];
        let answerIndex = -1;

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("Answer:")) {
                answerIndex = i;
                currentQuestion.answer = line.replace(/^Answer:\s*/, '').trim();
            } else if (/^[A-Z]\.\s/.test(line)) {
                currentQuestion.options.push(line.substring(3).trim());
            }
        }
    }
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
        fileContent: await getFileContent() // Extract the content of the uploaded file
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

// Spinner functions

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

// Initialize the functionality when the document is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    setupUniversitySelection();

    const examForm = document.querySelector(".exam-form");
    if (examForm) {
        examForm.addEventListener("submit", submitExamForm);
    }
});
