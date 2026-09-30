function markComplete() {
    const button = event.target;
    const card = button.closest(".assignment-card");

    card.classList.add("completed");
    button.textContent = "✓ Completed";
    button.disabled = true;
}

function updateStats() {
    const assignments = document.querySelectorAll(".assignment-card");
    const assignmentCount = document.getElementById("assignment-count");

    assignmentCount.textContent = assignments.length;
}
updateStats();
