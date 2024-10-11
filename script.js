// Function to highlight the selected university
function setupUniversitySelection() {
    const universityBoxes = document.querySelectorAll(".university-box");

    universityBoxes.forEach(box => {
        box.addEventListener("click", () => {
            // Remove the 'selected' class from all boxes
            universityBoxes.forEach(b => b.classList.remove("selected"));

            // Add the 'selected' class to the clicked box
            box.classList.add("selected");
        });
    });
}

// Helper to get the selected university (if any)
function getSelectedUniversity() {
    const selectedUniversity = document.querySelector(".university-box.selected");
    return selectedUniversity ? selectedUniversity.textContent : null;
}

// Function to fetch the OpenAI API key
async function fetchOpenAIKey(phpFilePath = "openai.php") {
    try {
        const response = await fetch(phpFilePath, {
            method: "GET"
        });

        if (!response.ok) {
            throw new Error("Key Not Fetched");
        }

        const data = await response.json(); // Parse the JSON response
        const apiKey = data[0]?.value; // Extract the API key from the response

        if (!apiKey) {
            throw new Error("API key not found in the response");
        }

        console.log("Fetched API Key:", apiKey); // Print the fetched API key
        return apiKey;
    } catch (error) {
        console.error("Error fetching API key:", error);
        throw new Error("Failed to fetch the OpenAI API key.");
    }
}
async function generateExamPreview(apiKey, formData, maxRetries = 3) {
    let retryCount = 0;
    let jsonResponse = null;

    while (retryCount < maxRetries) {
        try {
            const requestBody = {
                model: "gpt-4",
                messages: [
                    {
                        role: "system",
                        content: "You are an AI assistant that generates exam questions specific to the subject provided and suitable for the difficulty level of the selected university. Ensure that the questions directly address the core topics of the subject and match the academic rigor of the specified university."
                    },
                    {
                        role: "user",
                        content: `Create an exam for the subject "${formData.examName}" with the following specifications:
                        - ${formData.numMultipleChoice} multiple-choice questions
                        - ${formData.numFillInTheBlanks} fill-in-the-blank questions
                        - ${formData.numTrueFalse} true/false questions
                        - ${formData.examDuration} open-ended questions

                        Ensure the questions cover essential topics of "${formData.examName}" and are tailored to the level of difficulty expected at "${formData.university || "a typical university"}". Avoid generic questions—focus on those that would be taught and tested within the context of this subject.

                        Example output format:
                        {
                            "questions": [
                                {
                                    "question": "Explain the impact of market structures on pricing strategies.",
                                    "answer": "Market structures such as perfect competition, monopolistic competition, oligopoly, and monopoly influence pricing strategies.",
                                    "options": ["A. Climate", "B. Market structures", "C. Customer preferences", "D. Technological advances"], // Include this field only for multiple-choice questions
                                    "type": "multiple-choice"
                                }
                            ]
                        }`
                    }
                ],
                max_tokens: 4000
            };

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

            // Use regular expression to try extracting the JSON
            const jsonMatch = rawContent.match(/{[\s\S]*}/);
            if (!jsonMatch) {
                throw new Error("Response does not contain valid JSON format.");
            }

            const jsonString = jsonMatch[0];
            jsonResponse = JSON.parse(jsonString);

            // Ensure the number of questions matches the request
            jsonResponse = adjustQuestionCount(jsonResponse, formData);

            console.log("Parsed exam data:", jsonResponse);
            return jsonResponse;
        } catch (error) {
            console.warn(`Retry ${retryCount + 1} failed:`, error);
            retryCount++;
        }
    }

    throw new Error("Failed to generate exam preview after multiple retries.");
}

// Helper function to adjust the number of questions to match the specified total
function adjustQuestionCount(jsonResponse, formData) {
    const { numMultipleChoice, numFillInTheBlanks, numTrueFalse, examDuration } = formData;
    const totalRequestedQuestions = numMultipleChoice + numFillInTheBlanks + numTrueFalse + examDuration;

    // If the number of questions is too few, add placeholders
    while (jsonResponse.questions.length < totalRequestedQuestions) {
        jsonResponse.questions.push({
            question: "Placeholder question: Describe a general concept in this subject area.",
            answer: "Placeholder answer",
            options: [],
            type: "open-ended"
        });
    }

    // If the number of questions is too many, trim the excess
    if (jsonResponse.questions.length > totalRequestedQuestions) {
        jsonResponse.questions = jsonResponse.questions.slice(0, totalRequestedQuestions);
    }

    return jsonResponse;
}


// async function generateExamPreview(apiKey, formData, maxRetries = 3) {
//     let retryCount = 0;
//     let jsonResponse = null;

//     while (retryCount < maxRetries) {
//         try {
//             const requestBody = {
//                 model: "gpt-4",
//                 messages: [
//                     {
//                         role: "system",
//                         content: "You are an AI assistant that generates exam questions based on a specified subject and university level. The questions should directly relate to the exam subject and reflect the level of difficulty expected at the chosen university. The questions should not be generic but rather specific to the exam subject."
//                     },
//                     {
//                         role: "user",
//                         content: `Create an exam for the subject "${formData.examName}" with the following specifications:
//                         - ${formData.numMultipleChoice} multiple-choice questions
//                         - ${formData.numFillInTheBlanks} fill-in-the-blank questions
//                         - ${formData.numTrueFalse} true/false questions
//                         - ${formData.examDuration} open-ended questions

//                         The questions should match the subject of "${formData.examName}" and should be appropriate for the level of difficulty expected at "${formData.university || "a typical university"}". The questions should not reference any specific PDF content but should be inspired by the topic specified in the exam name.

//                         Example output format:
//                         {
//                             "questions": [
//                                 {
//                                     "question": "Explain the factors that affect language development in young children.",
//                                     "answer": "Genetic factors, environmental influences, and social interactions.",
//                                     "options": ["A. Technology", "B. Genetic factors", "C. Weather conditions", "D. Economic status"], // Include this field only for multiple-choice questions
//                                     "type": "multiple-choice"
//                                 }
//                             ]
//                         }`
//                     }
//                 ],
//                 max_tokens: 2000
//             };

//             const response = await fetch("https://api.openai.com/v1/chat/completions", {
//                 method: "POST",
//                 headers: {
//                     "Content-Type": "application/json",
//                     "Authorization": `Bearer ${apiKey}`
//                 },
//                 body: JSON.stringify(requestBody)
//             });

//             if (!response.ok) {
//                 const errorText = await response.text();
//                 console.error("Error response text:", errorText);
//                 throw new Error(`Failed to generate exam. Status: ${response.status} - ${response.statusText}`);
//             }

//             const data = await response.json();
//             const rawContent = data.choices[0].message.content.trim();

//             // Use regular expression to try extracting the JSON
//             const jsonMatch = rawContent.match(/{[\s\S]*}/);
//             if (!jsonMatch) {
//                 throw new Error("Response does not contain valid JSON format.");
//             }

//             const jsonString = jsonMatch[0];
//             jsonResponse = JSON.parse(jsonString);

//             // Ensure the number of questions matches the request
//             jsonResponse = adjustQuestionCount(jsonResponse, formData);

//             console.log("Parsed exam data:", jsonResponse);
//             return jsonResponse;
//         } catch (error) {
//             console.warn(`Retry ${retryCount + 1} failed:`, error);
//             retryCount++;
//         }
//     }

//     throw new Error("Failed to generate exam preview after multiple retries.");
// }


// // Helper function to adjust the number of questions to match the specified total
// function adjustQuestionCount(jsonResponse, formData) {
//     const { numMultipleChoice, numFillInTheBlanks, numTrueFalse, examDuration } = formData;
//     const totalRequestedQuestions = numMultipleChoice + numFillInTheBlanks + numTrueFalse + examDuration;

//     // If the number of questions is too few, add placeholders
//     while (jsonResponse.questions.length < totalRequestedQuestions) {
//         jsonResponse.questions.push({
//             question: "Placeholder question: Describe a general concept in this subject area.",
//             answer: "Placeholder answer",
//             options: [],
//             type: "open-ended"
//         });
//     }

//     // If the number of questions is too many, trim the excess
//     if (jsonResponse.questions.length > totalRequestedQuestions) {
//         jsonResponse.questions = jsonResponse.questions.slice(0, totalRequestedQuestions);
//     }

//     return jsonResponse;
// }


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

// Function to submit the exam form
async function submitExamForm(event) {
    event.preventDefault();

    // Show the spinner
    showSpinner();

    const formData = {
        examName: document.getElementById("exam-name").value,
        numMultipleChoice: parseInt(document.getElementById("multiple-choice").value, 10),
        numFillInTheBlanks: parseInt(document.getElementById("fill-blanks").value, 10),
        numTrueFalse: parseInt(document.getElementById("true-false").value, 10),
        hardnessLevel: document.getElementById("hardness-level").value,
        university: getSelectedUniversity(),
        fileContent: await getFileContent()
    };

    try {
        const apiKey = await fetchOpenAIKey();
        const examPreview = await generateExamPreview(apiKey, formData);
        showExamPreviewModal(examPreview); // Pass the exam data to the modal
    } catch (error) {
        console.error("Error submitting form:", error);
        alert("Failed to generate exam. Please try again.");
    } finally {
        // Hide the spinner
        hideSpinner();
    }
}


async function getFileContent() {
    const fileInput = document.getElementById("file-upload");
    if (fileInput && fileInput.files.length > 0) {
        const file = fileInput.files[0];

     
        if (file.size > 2 * 1024 * 1024) {
            alert("The file is too large. Please upload a file smaller than 2MB.");
            return null;
        }

        return await file.text();
    }
    return null;
}


// Function to show the exam preview in a modal
function showExamPreviewModal(examData) {
    // Check if the examData has a 'questions' property and it's an array
    if (!examData || !Array.isArray(examData.questions)) {
        console.error("Invalid exam data format: 'questions' not found or not an array.");
        alert("Failed to load exam questions. Please try again.");
        return;
    }

    // Extract the questions from the JSON response
    const questions = examData.questions;

    let currentQuestionIndex = 0;

    function updateQuestionView() {
        const currentQuestion = questions[currentQuestionIndex];
        const questionText = currentQuestion.question;
        const answerText = currentQuestion.answer;
        const options = currentQuestion.options || [];

        // Combine the question, options, and answer into a single text format
        let content = `Q: ${questionText}\n`;
        if (options.length > 0) {
            options.forEach((option, index) => {
                content += `${String.fromCharCode(65 + index)}. ${option}\n`;
            });
        }
        content += `Answer: ${answerText}`;

        // Update the content in the textarea
        const questionContent = document.querySelector("#question-content");
        if (questionContent) {
            questionContent.value = content;
        }

        // Update question number
        document.querySelector("#question-number").textContent = `Question ${currentQuestionIndex + 1} of ${questions.length}`;
    }

    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal-content">
                <h2>Exam Preview</h2>
                <div class="question-navigation">
                    <button id="prev-question" onclick="prevQuestion()">Previous</button>
                    <span id="question-number">Question 1 of ${questions.length}</span>
                    <button id="next-question" onclick="nextQuestion()">Next</button>
                </div>
                <textarea id="question-content" class="question-content" placeholder="Edit the question, options, and answer..."></textarea>
                <div class="modal-buttons">
                    <button id="close-modal" onclick="window.closeModal()">Close</button>
                    <button onclick="finalizeExam()">Finalize</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    updateQuestionView();

    // Functions to navigate between questions
    window.prevQuestion = function() {
        if (currentQuestionIndex > 0) {
            saveCurrentQuestion();
            currentQuestionIndex--;
            updateQuestionView();
        }
    };

    window.nextQuestion = function() {
        if (currentQuestionIndex < questions.length - 1) {
            saveCurrentQuestion();
            currentQuestionIndex++;
            updateQuestionView();
        }
    };

    // Save the current question's edited content before moving to the next/previous question
    function saveCurrentQuestion() {
        const currentQuestion = questions[currentQuestionIndex];
        const content = document.querySelector("#question-content").value;

        // Parse the content back into question, options, and answer
        const lines = content.split("\n");
        currentQuestion.question = lines[0].replace(/^Q:\s*/, '').trim(); // Remove "Q:" and trim
        currentQuestion.options = [];
        let answerIndex = -1;

        // Extract options and answer
        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.startsWith("Answer:")) {
                answerIndex = i;
                currentQuestion.answer = line.replace(/^Answer:\s*/, '').trim(); // Remove "Answer:" and trim
            } else if (/^[A-Z]\.\s/.test(line)) {
                currentQuestion.options.push(line.substring(3).trim()); // Remove "A. ", "B. ", etc.
            }
        }
    }

    // Function to close the modal
    window.closeModal = function() {
        const modalOverlay = document.querySelector(".modal-overlay");
        if (modalOverlay) {
            modalOverlay.remove();
        }
    };

    // Function to finalize the exam
    window.finalizeExam = function() {
        saveCurrentQuestion();
        alert("Exam finalized! You can now use the edited content.");
        closeModal();
    };
}

// Initialize the functionality when the document is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    setupUniversitySelection();

    // Initialize the form submission event listener
    const examForm = document.querySelector(".exam-form");
    if (examForm) {
        examForm.addEventListener("submit", submitExamForm);
    }
});
