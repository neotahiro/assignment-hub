function markComplete() {
    const button = event.target;
    const card = button.closest(".assignment-card");

    card.classList.add("completed");
    button.textContent = "✓ Completed";
    button.disabled = true;
}
