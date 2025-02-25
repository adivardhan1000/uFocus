  // popup.js

  // Utility: Convert timestamp string from datetime-local input to milliseconds
  function parseDateTime(value) {
      return new Date(value).getTime();
    }
    
    // Utility: Convert seconds to days, hours, minutes, and seconds
    function formatTime(seconds) {
      const days = Math.floor(seconds / (24 * 60 * 60));
      seconds %= 24 * 60 * 60;
      const hours = Math.floor(seconds / (60 * 60));
      seconds %= 60 * 60;
      const minutes = Math.floor(seconds / 60);
      seconds %= 60;
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    }
    
    // Aggregate session data by domain and sum durations (in seconds)
    function aggregateData(sessions, fromTime, toTime) {
      const totals = {};
      sessions.forEach(session => {
        // Check if session start is within the desired range
        if (session.start >= fromTime && session.start <= toTime) {
          const durationSec = Math.floor((session.end - session.start) / 1000);
          if (totals[session.domain]) {
            totals[session.domain] += durationSec;
          } else {
            totals[session.domain] = durationSec;
          }
        }
      });
      return totals;
    }
    
    // Render the table with aggregated data
    function renderTable(totals) {
      const tbody = document.querySelector("#dataTable tbody");
      tbody.innerHTML = "";
      for (const domain in totals) {
        const row = document.createElement("tr");
        const cellDomain = document.createElement("td");
        cellDomain.textContent = domain;
        const cellTime = document.createElement("td");
        cellTime.textContent = formatTime(totals[domain]);
        row.appendChild(cellDomain);
        row.appendChild(cellTime);
        tbody.appendChild(row);
      }
    }
    
    // Apply the selected filter and update table
    function applyFilter() {
      const filter = document.getElementById("filter").value;
      let fromTime, toTime;
      const now = Date.now();
    
      if (filter === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        fromTime = today.getTime();
        toTime = now;
      } else if (filter === "past24") {
        fromTime = now - (24 * 60 * 60 * 1000);
        toTime = now;
      } else if (filter === "all") {
        fromTime = 0;
        toTime = now;
      } else if (filter === "custom") {
        const fromInput = document.getElementById("fromTime").value;
        const toInput = document.getElementById("toTime").value;
        if (!fromInput || !toInput) {
          alert("Please select both From and To times for custom range.");
          return;
        }
        fromTime = parseDateTime(fromInput);
        toTime = parseDateTime(toInput);
      }
    
      browser.storage.local.get({ sessions: [] }).then(result => {
        const totals = aggregateData(result.sessions, fromTime, toTime);
        renderTable(totals);
      });
    }
    
    // Export data in the current filtered view as CSV
    function exportCSV() {
      const filter = document.getElementById("filter").value;
      let fromTime, toTime;
      const now = Date.now();
    
      if (filter === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        fromTime = today.getTime();
        toTime = now;
      } else if (filter === "past24") {
        fromTime = now - (24 * 60 * 60 * 1000);
        toTime = now;
      } else if (filter === "all") {
        fromTime = 0;
        toTime = now;
      } else if (filter === "custom") {
        const fromInput = document.getElementById("fromTime").value;
        const toInput = document.getElementById("toTime").value;
        if (!fromInput || !toInput) {
          alert("Please select both From and To times for custom range.");
          return;
        }
        fromTime = parseDateTime(fromInput);
        toTime = parseDateTime(toInput);
      }
    
      browser.storage.local.get({ sessions: [] }).then(result => {
        const totals = aggregateData(result.sessions, fromTime, toTime);
        let csvContent = "Domain,Time Spent (seconds)\n";
        for (const domain in totals) {
          csvContent += `${domain},${totals[domain]}\n`;
        }
        // Create a Blob and download the CSV file
        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "time_tracker_data.csv";
        a.click();
        URL.revokeObjectURL(url);
      });
    }
    
    // Clear all stored data
    function clearData() {
      if (confirm("Are you sure you want to clear all tracked data?")) {
        browser.storage.local.set({ sessions: [] }).then(() => {
          renderTable({});
        });
      }
    }
    
    // Show/hide custom date inputs based on filter selection
    document.getElementById("filter").addEventListener("change", (e) => {
      const customDiv = document.getElementById("customRange");
      if (e.target.value === "custom") {
        customDiv.style.display = "block";
      } else {
        customDiv.style.display = "none";
      }
    });
    
    // Event listeners for buttons
    document.getElementById("applyFilter").addEventListener("click", applyFilter);
    document.getElementById("exportCsv").addEventListener("click", exportCSV);
    document.getElementById("clearData").addEventListener("click", clearData);
    
    // Apply default filter on popup load
    applyFilter();
