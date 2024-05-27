async function loadContent() {
    try {
        const headerResponse = await fetch('header.html');
        if (!headerResponse.ok) throw new Error('Failed to load header');
        const headerContent = await headerResponse.text();
        document.getElementById('site-header').innerHTML = headerContent;

        const footerResponse = await fetch('footer.html');
        if (!footerResponse.ok) throw new Error('Failed to load footer');
        const footerContent = await footerResponse.text();
        document.getElementById('site-footer').innerHTML = footerContent;

        // Show the search type container only on index.html
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
            showSearchType();
        }

        // Add event listeners after loading the header content
        document.querySelectorAll('input[name="search-type"]').forEach((elem) => {
            elem.addEventListener("change", function(event) {
                if (event.target.value === "clinical") {
                    document.getElementById("non-clinical-content").classList.add("hidden");
                    document.getElementById("clinical-content").classList.remove("hidden");
                } else {
                    document.getElementById("non-clinical-content").classList.remove("hidden");
                    document.getElementById("clinical-content").classList.add("hidden");
                }
            });
        });

        // Add event listener for home button
        const homeButton = document.getElementById('home-button');
        if (homeButton) {
            homeButton.addEventListener('click', () => {
                window.location.href = 'index.html';
            });
        }

        // Add event listener for guided tour button
        const guidedTourButton = document.getElementById('guided-tour-button');
        if (guidedTourButton) {
            guidedTourButton.addEventListener('click', () => {
                window.open('tutorial.pdf', '_blank');
            });
        }

    } catch (error) {
        console.error('Error loading content:', error);
        document.getElementById('site-header').innerHTML = '<p>Error loading header.</p>';
        document.getElementById('site-footer').innerHTML = '<p>Error loading footer.</p>';
    }
}

async function loadGrants() {
    try {
        const response = await fetch('grants.json');
        if (!response.ok) throw new Error('Failed to load grants');
        const grants = await response.json();
        return grants;
    } catch (error) {
        console.error('Error loading grants:', error);
        return [];
    }
}

function filterGrants(grants, query) {
    if (!query) {
        return grants; // Return all grants if the query is empty
    }
    const fuseOptions = {
        keys: ['title', 'fundingAgency', 'piName', 'institution', 'contactPerson', 'location', 'details.grantAwardNumber', 'details.country', 'details.institutionalAffiliation', 'details.institutionalAddress', 'details.institutionalTitle'],
        threshold: 0.3 // Adjust the threshold for fuzziness
    };
    const fuse = new Fuse(grants, fuseOptions);
    return fuse.search(query).map(result => result.item);
}

function handleQuickSearch(event) {
    event.preventDefault();
    const query = document.getElementById('quick-search-input').value;
    loadGrants().then(grants => {
        const filteredGrants = filterGrants(grants, query);
        localStorage.setItem('searchResults', JSON.stringify(filteredGrants));
        window.location.href = 'grant_result.html';
    });
}

function handleAdvancedSearch(event) {
    event.preventDefault();
    const filters = {
        fundingAgency: document.getElementById('funding-agency').value,
        grantAwardNumber: document.getElementById('grant-award-number').value,
        country: document.getElementById('country').value,
        piName: document.getElementById('pi-name').value,
        startDate: document.getElementById('start-date').value,
        endDate: document.getElementById('end-date').value,
        facilityName: document.getElementById('facility-name').value,
        lga: document.getElementById('lga').value,
        state: document.getElementById('state').value,
        studyTitle: document.getElementById('study-title').value
    };

    loadGrants().then(grants => {
        const filteredGrants = grants.filter(grant => {
            return Object.keys(filters).every(key => {
                if (!filters[key]) return true;
                if (key === 'startDate' || key === 'endDate') {
                    const date = new Date(grant.details[key === 'startDate' ? 'commencementDate' : 'endDate']);
                    return date >= new Date(filters.startDate) && date <= new Date(filters.endDate);
                }
                const fuse = new Fuse([grant[key], grant.details[key]], { threshold: 0.3 });
                return fuse.search(filters[key]).length > 0;
            });
        });
        localStorage.setItem('searchResults', JSON.stringify(filteredGrants));
        window.location.href = 'grant_result.html';
    });
}

window.onload = async function() {
    await loadContent();

    // Initial setup for content visibility
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        document.getElementById("non-clinical-content").classList.remove("hidden");
        document.getElementById("clinical-content").classList.add("hidden");

        document.getElementById('quick-search-form').addEventListener('submit', handleQuickSearch);
        document.getElementById('advanced-search-form').addEventListener('submit', handleAdvancedSearch);
        document.getElementById('advanced-search-toggle').addEventListener('click', () => {
            document.getElementById('advanced-search').classList.toggle('hidden');
        });
    }
    if (window.location.pathname.endsWith('grant_result.html')) {
        const searchResults = JSON.parse(localStorage.getItem('searchResults')) || [];
        const tableBody = document.getElementById('grants-table-body');
        tableBody.innerHTML = ''; // Clear existing rows

        searchResults.forEach((grant, index) => {
            const row = document.createElement('tr');
            row.classList.add(grant.isClinicalTrial ? 'bg-blue-100' : 'bg-white'); // Add background color for clinical trials
            row.innerHTML = `
                <td class="py-4 px-6 border-b border-gray-200 text-sm font-medium text-gray-900">${grant.title}</td>
                <td class="py-4 px-6 border-b border-gray-200 text-sm text-gray-700">${grant.fundingAgency}</td>
                <td class="py-4 px-6 border-b border-gray-200 text-sm text-gray-700">${grant.piName}</td>
                <td class="py-4 px-6 border-b border-gray-200 text-sm text-gray-700">${grant.institution}</td>
                <td class="py-4 px-6 border-b border-gray-200 text-sm text-gray-700">${grant.contactPerson}</td>
                <td class="py-4 px-6 border-b border-gray-200 text-sm text-gray-700">${grant.dates}</td>
                <td class="py-4 px-6 border-b border-gray-200 text-sm text-gray-700">${grant.location}</td>
                <td class="py-4 px-6 border-b border-gray-200 text-sm text-gray-700">
                    ${grant.isClinicalTrial ? 'Clinical Trial' : 'No'}
                </td>
                <td class="py-4 px-6 border-b border-gray-200 text-sm text-center">
                    <button class="bg-blue-600 hover:bg-blue-800 text-white font-bold py-2 px-4 rounded" onclick="showDetails('grant${index}')">View</button>
                </td>
            `;
            tableBody.appendChild(row);
            const detailsRow = document.createElement('tr');
            detailsRow.id = `grant${index}`;
            detailsRow.classList.add('hidden');
            detailsRow.innerHTML = `
                <td colspan="8" class="py-4 px-6 border-b border-gray-200">
                    <div class="bg-gray-50 p-4 rounded-lg shadow-md ${grant.isClinicalTrial ? 'bg-blue-100' : ''}">
                        <table class="min-w-full bg-white">
                            <tr><td class="font-semibold">Funding Agency:</td><td>${grant.fundingAgency}</td></tr>
                            <tr><td class="font-semibold">Grant Award Number:</td><td>${grant.details.grantAwardNumber}</td></tr>
                            <tr><td class="font-semibold">Country:</td><td>${grant.details.country}</td></tr>
                            <tr><td class="font-semibold">PI Name:</td><td>${grant.piName}</td></tr>
                            <tr><td class="font-semibold">Institutional Affiliation:</td><td>${grant.details.institutionalAffiliation}</td></tr>
                            <tr><td class="font-semibold">Institutional Address:</td><td>${grant.details.institutionalAddress}</td></tr>
                            <tr><td class="font-semibold">Institutional Title:</td><td>${grant.details.institutionalTitle}</td></tr>
                            <tr><td class="font-semibold">Email:</td><td>${grant.details.email}</td></tr>
                            <tr><td class="font-semibold">Phone:</td><td>${grant.details.phone}</td></tr>
                            <tr><td class="font-semibold">Contact Person:</td><td>${grant.contactPerson}</td></tr>
                            <tr><td class="font-semibold">Contact Email:</td><td>${grant.details.contactEmail}</td></tr>
                            <tr><td class="font-semibold">Contact Phone:</td><td>${grant.details.contactPhone}</td></tr>
                            <tr><td class="font-semibold">Commencement Date:</td><td>${grant.details.commencementDate}</td></tr>
                            <tr><td class="font-semibold">End Date:</td><td>${grant.details.endDate}</td></tr>
                            <tr><td class="font-semibold">Location of Grant Implementation:</td><td>${grant.details.locationOfGrantImplementation}</td></tr>
                            <tr><td class="font-semibold">Study Summary:</td><td>${grant.details.studySummary}</td></tr>
                            <tr><td class="font-semibold">Total Grant Amount:</td><td>${grant.details.totalGrantAmount}</td></tr>
                            <tr><td class="font-semibold">Direct Cost:</td><td>${grant.details.directCost}</td></tr>
                            <tr><td class="font-semibold">Indirect Cost:</td><td>${grant.details.indirectCost}</td></tr>
                            <tr><td class="font-semibold">FGN Registration Number:</td><td>${grant.details.fgnRegistrationNumber}</td></tr>
                        </table>
                    </div>
                </td>
            `;
            tableBody.appendChild(detailsRow);
        });

        // Add event listener for export button
        const exportButton = document.getElementById('export-button');
        if (exportButton) {
            exportButton.addEventListener('click', exportTableToExcel);
        }
    }
}

function showSearchType() {
    document.getElementById('search-type-container').classList.remove('hidden');
}

function showDetails(id) {
    var element = document.getElementById(id);
    if (element.classList.contains('hidden')) {
        element.classList.remove('hidden');
    } else {
        element.classList.add('hidden');
    }
}

function exportTableToExcel() {
    const searchResults = JSON.parse(localStorage.getItem('searchResults')) || [];

    const rows = searchResults.map(grant => [
        grant.title,
        grant.fundingAgency,
        grant.piName,
        grant.institution,
        grant.contactPerson,
        grant.dates,
        grant.location,
        grant.details.grantAwardNumber,
        grant.details.country,
        grant.details.institutionalAffiliation,
        grant.details.institutionalAddress,
        grant.details.institutionalTitle,
        grant.details.email,
        grant.details.phone,
        grant.details.contactEmail,
        grant.details.contactPhone,
        grant.details.commencementDate,
        grant.details.endDate,
        grant.details.locationOfGrantImplementation,
        grant.details.studySummary,
        grant.details.totalGrantAmount,
        grant.details.directCost,
        grant.details.indirectCost,
        grant.details.fgnRegistrationNumber
    ]);

    // Add headers to the rows
    const headers = [
        "Project Title", "Funding Agency", "PI Name", "Institution",
        "Contact Person", "Dates", "Location", "Grant Award Number", "Country",
        "Institutional Affiliation", "Institutional Address", "Institutional Title",
        "Email", "Phone", "Contact Email", "Contact Phone", "Commencement Date",
        "End Date", "Location of Grant Implementation", "Study Summary",
        "Total Grant Amount", "Direct Cost", "Indirect Cost", "FGN Registration Number"
    ];
    rows.unshift(headers);

    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Grants');

    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    const filename = `grants_${timestamp}.xlsx`;

    XLSX.writeFile(workbook, filename);
}

document.addEventListener('DOMContentLoaded', () => {
    const exportButton = document.getElementById('export-button');
    if (exportButton) {
        exportButton.addEventListener('click', exportTableToExcel);
    }
});