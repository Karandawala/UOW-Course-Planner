document.addEventListener("DOMContentLoaded", function() {
    const courseSelect = document.getElementById("course");
    const majorSelect = document.getElementById("major");
    const allMajors = Array.from(majorSelect.options);

    courseSelect.addEventListener("change", function() {
        const selectedCourse = this.value;

        // Filter the majors based on the selected course
        const filteredMajors = allMajors.filter(function(option) {
            return option.getAttribute("data-course-id") === selectedCourse;
        });

        // Clear the major dropdown
        majorSelect.innerHTML = "";

        // Populate the major dropdown with the filtered majors
        filteredMajors.forEach(function(option) {
            majorSelect.appendChild(option.cloneNode(true));
        });
    });
});