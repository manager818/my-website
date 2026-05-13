function saveData() {
  fetch("https://script.google.com/macros/s/AKfycbxfTVfN7ifwOh988V7v1JBZDGLQfPSt5bhEkgCPo3VaCuxMdpCtlaq5rKRYOHVzNZw5/exec", {  // replace with your real URL
    method: "POST",
    body: JSON.stringify({
      name: document.getElementById("name").value,
      message: document.getElementById("message").value
    })
  })
  .then(res => res.text())
  .then(data => alert("Saved: " + data))
  .catch(err => console.error(err));
}

function loadData() {
  fetch("https://script.google.com/macros/s/AKfycbxfTVfN7ifwOh988V7v1JBZDGLQfPSt5bhEkgCPo3VaCuxMdpCtlaq5rKRYOHVzNZw5/exec")   // same URL here
    .then(res => res.json())
    .then(rows => {
      let output = "";
      rows.forEach((row, index) => {
        if (index === 0) return; // skip header row
        output += `<p><b>${row[0]}:</b> ${row[1]} (${row[2]})</p>`;
      });
      document.getElementById("output").innerHTML = output;
    })
    .catch(err => console.error(err));
}
