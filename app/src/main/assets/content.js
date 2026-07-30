(function() {
    'use strict';

    function triggerVueChange(el, value, win) {
        if (!el) return;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        if (win && win.jQuery) win.jQuery(el).trigger('change');
    }

    async function waitForOptions(doc, selector, minLen = 1) {
        for(let i=0; i<30; i++) {
            let el = doc.querySelector(selector);
            if (el && el.options.length > minLen) return el;
            await new Promise(r => setTimeout(r, 500));
        }
        return doc.querySelector(selector);
    }

    function calculateLag(dateStr) {
        if (!dateStr || dateStr === 'Not Found' || dateStr === 'Not Scanned') return '-';
        try {
            let branchDate = new Date(dateStr);
            if (isNaN(branchDate.getTime())) {
                let parts = dateStr.split(/[-/]/);
                if (parts.length === 3) {
                    branchDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
                }
            }
            if (isNaN(branchDate.getTime())) return '-';

            let today = new Date();
            today.setHours(0,0,0,0);
            branchDate.setHours(0,0,0,0);

            let diffTime = today.getTime() - branchDate.getTime();
            let diffDays = Math.floor(diffTime / (1000 * 3600 * 24));
            return diffDays;
        } catch (e) {
            return '-';
        }
    }

    function fetchDatesViaInvisibleFrame(mode, level, targetId, branchesToProcess) {
        return new Promise((resolve) => {
            let iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed; top:0; left:0; width:1000px; height:800px; opacity:0.001; border:none; z-index:-999; pointer-events:none;';

            let targetHash = mode === 'MIS' ? '#/mis/dashboard' : '#/ais/dashboard';
            iframe.src = window.location.origin + window.location.pathname + targetHash;
            document.body.appendChild(iframe);

            let timeout = setTimeout(() => { iframe.remove(); resolve({}); }, 45000);
            let isProcessed = false;

            iframe.onload = () => {
                if(isProcessed) return;

                setTimeout(async () => {
                    try {
                        let doc = iframe.contentDocument || iframe.contentWindow.document;
                        let win = iframe.contentWindow;

                        for(let i=0; i<6; i++) {
                            let reportLvlDropdown = doc.querySelector('select[name="cbo_report_level"]');
                            let branchDropdown = doc.querySelector('select[name="cbo_branch"]');
                            let searchBtn = doc.querySelector('button[type="submit"]') || doc.querySelector('.btn-primary') || doc.querySelector('.btn-success');

                            if (reportLvlDropdown || branchDropdown) {
                                
                                if (reportLvlDropdown) {
                                    triggerVueChange(reportLvlDropdown, '1', win);
                                    await new Promise(r => setTimeout(r, 800));

                                    if (level === '3' && targetId !== 'ALL') {
                                        let zoneSel = await waitForOptions(doc, 'select[name="cbo_zone"]');
                                        if (zoneSel) { triggerVueChange(zoneSel, targetId, win); await new Promise(r => setTimeout(r, 800)); }
                                    } 
                                    else if (level === '2' && targetId !== 'ALL') {
                                        let areaSel = await waitForOptions(doc, 'select[name="cbo_area"]');
                                        if (areaSel) { triggerVueChange(areaSel, targetId, win); await new Promise(r => setTimeout(r, 800)); }
                                    }
                                }

                                if (level === '1' && targetId !== 'ALL') {
                                    let bSel = await waitForOptions(doc, 'select[name="cbo_branch"]');
                                    if (bSel) { triggerVueChange(bSel, targetId, win); await new Promise(r => setTimeout(r, 800)); }
                                }

                                if (searchBtn) {
                                    searchBtn.removeAttribute('disabled');
                                    searchBtn.click();
                                    await new Promise(r => setTimeout(r, 1500));
                                }
                                break;
                            }
                            await new Promise(r => setTimeout(r, 500));
                        }

                        async function clickWhenReady(text, isExact = false, maxWaitMs = 15000) {
                            let start = Date.now();
                            return new Promise(resolve => {
                                let timer = setInterval(async () => {
                                    let elements = doc.querySelectorAll('a, button, span, li, div');
                                    let clicked = false;
                                    for (let el of elements) {
                                        let txt = (el.innerText || el.textContent || "").toLowerCase().trim();
                                        if (isExact ? (txt === text) : txt.includes(text)) {
                                            el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: win }));
                                            el.click();
                                            clicked = true;
                                            await new Promise(r => setTimeout(r, 200));
                                        }
                                    }
                                    if (clicked) {
                                        clearInterval(timer); resolve(true);
                                    }
                                    if (Date.now() - start > maxWaitMs) {
                                        clearInterval(timer); resolve(false);
                                    }
                                }, 500);
                            });
                        }

                        if (mode === 'MIS') {
                            await clickWhenReady('branch performance', false, 15000);
                            await new Promise(r => setTimeout(r, 1000));
                            await clickWhenReady('more...', true, 15000);
                        }
                        else if (mode === 'AIS') {
                            await clickWhenReady('branch status', false, 15000);
                        }

                        let pollCount = 0;
                        let poll = setInterval(() => {
                            pollCount++;
                            if (pollCount > 35) {
                                clearInterval(poll); clearTimeout(timeout);
                                iframe.remove(); resolve({}); return;
                            }

                            let exportContainers = doc.querySelectorAll('#export-data, table');
                            for (let exportContainer of exportContainers) {
                                let rows = exportContainer.querySelectorAll('tbody tr');

                                if (rows.length > 2) {
                                    let bodyText = exportContainer.textContent.toLowerCase();
                                    let foundTarget = false;

                                    if (targetId === 'ALL' || branchesToProcess.length === 0) {
                                        foundTarget = true;
                                    } else {
                                        for (let b of branchesToProcess) {
                                            let bCodeMatch = b.name.match(/(?:^|-|\s)(\d{3,4})(?:$|-|\s)/);
                                            let bCode = bCodeMatch ? bCodeMatch[1] : b.name.replace(/[^a-z]/gi, '').toLowerCase();
                                            if (bodyText.includes(bCode)) {
                                                foundTarget = true;
                                                break;
                                            }
                                        }
                                    }

                                    if (foundTarget) {
                                        clearInterval(poll); clearTimeout(timeout);
                                        isProcessed = true;

                                        let dataMap = {};
                                        for(let tr of rows) {
                                            let cells = tr.querySelectorAll('td');
                                            if(cells.length > 2) {
                                                let branchCellStr = cells[1] ? cells[1].textContent.trim().toLowerCase() : "";
                                                let bCodeMatch = branchCellStr.match(/(?:^|-|\s)(\d{3,4})(?:$|-|\s)/);
                                                let bCode = bCodeMatch ? bCodeMatch[1] : branchCellStr.replace(/[^a-z]/g, '');

                                                let match = tr.textContent.match(/\d{1,2}\s+[a-zA-Z]{3},\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}|\d{2}\/\d{2}\/\d{4}/g);
                                                if (match && match.length > 0) {
                                                    let finalDate = match[match.length - 1].replace(/\s+/g, ' ');
                                                    dataMap[bCode] = finalDate;
                                                }
                                            }
                                        }
                                        iframe.remove(); resolve(dataMap);
                                        return;
                                    }
                                }
                            }
                        }, 1000);

                    } catch(e) {
                        clearTimeout(timeout); iframe.remove(); resolve({});
                    }
                }, 3000);
            };
        });
    }

    function makeDraggable(elmnt, header) {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        header.onmousedown = dragMouseDown;
        header.style.cursor = "move";
        function dragMouseDown(e) {
            e = e || window.event; e.preventDefault();
            pos3 = e.clientX; pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            document.onmousemove = elementDrag;
        }
        function elementDrag(e) {
            e = e || window.event; e.preventDefault();
            pos1 = pos3 - e.clientX; pos2 = pos4 - e.clientY;
            pos3 = e.clientX; pos4 = e.clientY;
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
            elmnt.style.right = 'auto'; elmnt.style.bottom = 'auto';
        }
        function closeDragElement() {
            document.onmouseup = null; document.onmousemove = null;
        }
    }

    function syncLocations(statusCallback) {
        return new Promise((resolve) => {
            let iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed; top:0; left:0; width:1000px; height:800px; opacity:0.001; border:none; z-index:-999; pointer-events:none;';
            iframe.src = window.location.origin + window.location.pathname + '#/reports/po-mis-reports/po-mis-1-index';
            document.body.appendChild(iframe);

            let timeout = setTimeout(() => { iframe.remove(); resolve(false); }, 60000);

            iframe.onload = () => {
                if(statusCallback) statusCallback("সিস্টেম স্ক্যান করা হচ্ছে...");
                setTimeout(async () => {
                    try {
                        let doc = iframe.contentDocument || iframe.contentWindow.document;
                        let win = iframe.contentWindow;

                        let reportLvl = null, branchSel = null;
                        for(let i=0; i<40; i++) {
                            reportLvl = doc.querySelector('select[name="cbo_report_level"]');
                            branchSel = doc.querySelector('select[name="cbo_branch"]');
                            if(reportLvl || branchSel) break;
                            await new Promise(r => setTimeout(r, 500));
                        }

                        let zones = [], areas = [], branches = [];
                        let zMap = {}, aMap = {};

                        if (reportLvl) {
                            let hasZone = Array.from(reportLvl.options).some(o => o.value === '3');
                            let hasArea = Array.from(reportLvl.options).some(o => o.value === '2');
                            let hasBranch = Array.from(reportLvl.options).some(o => o.value === '1');

                            if (hasZone) {
                                localStorage.setItem('mf_user_type', 'HO');
                                if(statusCallback) statusCallback("জোন সিঙ্ক হচ্ছে...");
                                triggerVueChange(reportLvl, '3', win);
                                await new Promise(r => setTimeout(r, 800));
                                let zoneSel = await waitForOptions(doc, 'select[name="cbo_zone"]');
                                if (zoneSel) {
                                    let currentZone = "Unknown Zone";
                                    Array.from(zoneSel.options).forEach(opt => {
                                        if (opt.value && opt.value !== '-1' && !opt.text.includes('--')) {
                                            if (!opt.disabled && !opt.value.includes('@@@')) {
                                                currentZone = opt.text.trim();
                                                zones.push({id: opt.value, name: currentZone});
                                            } else if (opt.disabled && opt.value.includes('@@@')) {
                                                let areaName = opt.text.replace(/\u00A0/g, '').replace(/@@@/g, '').trim();
                                                if(areaName) zMap[areaName] = currentZone;
                                            }
                                        }
                                    });
                                }
                            }

                            if (hasArea) {
                                if (!hasZone) localStorage.setItem('mf_user_type', 'AREA');
                                if(statusCallback) statusCallback("অঞ্চল সিঙ্ক হচ্ছে...");
                                triggerVueChange(reportLvl, '2', win);
                                await new Promise(r => setTimeout(r, 800));
                                let areaSel = await waitForOptions(doc, 'select[name="cbo_area"]');
                                if (areaSel) {
                                    let currentArea = "Unknown Area";
                                    Array.from(areaSel.options).forEach(opt => {
                                        if (opt.value && opt.value !== '-1' && !opt.text.includes('--')) {
                                            if (!opt.disabled && !opt.value.includes('@@@')) {
                                                currentArea = opt.text.trim();
                                                areas.push({id: opt.value, name: currentArea, zone: zMap[currentArea] || "Unknown Zone"});
                                            } else if (opt.disabled && opt.value.includes('@@@')) {
                                                let branchId = opt.value.split('##')[1] || opt.value.replace(/[^0-9]/g, '');
                                                let branchNameClean = opt.text.replace(/\u00A0/g, '').replace(/@@@/g, '').trim();
                                                if(branchId) aMap[branchId] = currentArea;
                                                if(branchNameClean) aMap[branchNameClean] = currentArea;
                                            }
                                        }
                                    });
                                }
                            }

                            if (hasBranch) {
                                if (!hasZone && !hasArea) localStorage.setItem('mf_user_type', 'BRANCH');
                                if(statusCallback) statusCallback("শাখা সিঙ্ক হচ্ছে...");
                                triggerVueChange(reportLvl, '1', win);
                                await new Promise(r => setTimeout(r, 800));
                                let bSel = await waitForOptions(doc, 'select[name="cbo_branch"]');
                                if (bSel) {
                                    Array.from(bSel.options).forEach(opt => {
                                        if (opt.value && opt.value !== '-1' && !opt.text.includes('--')) {
                                            let bName = opt.text.trim();
                                            if (!opt.disabled && !opt.value.includes('@@@') && !/\b(area|zone)\b/i.test(bName)) {
                                                let bId = opt.value;
                                                let bArea = aMap[bId] || aMap[bName] || "Unknown Area";
                                                branches.push({id: bId, name: bName, area: bArea, zone: zMap[bArea] || "Unknown Zone"});
                                            }
                                        }
                                    });
                                }
                            }
                        }
                        else if (branchSel) {
                            localStorage.setItem('mf_user_type', 'AREA');
                            if(statusCallback) statusCallback("শাখা সিঙ্ক হচ্ছে...");
                            let bSel = await waitForOptions(doc, 'select[name="cbo_branch"]', 0);
                            if (bSel) {
                                Array.from(bSel.options).forEach(opt => {
                                    if (opt.value && opt.value !== '-1' && opt.value !== '' && !opt.text.includes('--')) {
                                        let bName = opt.text.trim();
                                        if (!opt.disabled && !opt.value.includes('@@@') && !/\b(area|zone)\b/i.test(bName)) {
                                            branches.push({id: opt.value, name: bName, area: 'N/A', zone: 'N/A'});
                                        }
                                    }
                                });
                            }
                        }
                        else {
                            localStorage.setItem('mf_user_type', 'BRANCH');
                            if(statusCallback) statusCallback("সিস্টেম প্রস্তুত!");
                            branches.push({id: 'SELF', name: 'My Branch', area: 'N/A', zone: 'N/A'});
                        }

                        localStorage.setItem('mf_cached_zones', JSON.stringify(zones));
                        localStorage.setItem('mf_cached_areas', JSON.stringify(areas));
                        localStorage.setItem('mf_cached_branches', JSON.stringify(branches));
                        
                        clearTimeout(timeout); iframe.remove(); resolve(true);
                    } catch(e) { clearTimeout(timeout); iframe.remove(); resolve(false); }
                }, 2000);
            };
        });
    }

    function performRoleWiseSync() {
        if (document.getElementById('sync-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'sync-overlay';
        overlay.style.cssText = 'position:fixed; top:15px; right:15px; background:#f39c12; color:white; padding:10px 15px; z-index:99999; border-radius:6px; font-size:12px; font-weight:bold; box-shadow: 0 4px 8px rgba(0,0,0,0.3);';
        overlay.innerHTML = '⚙️ Analyzing User Role & Hierarchy...';
        document.body.appendChild(overlay);

        syncLocations((msg) => {
            if(document.getElementById('sync-overlay')) {
                document.getElementById('sync-overlay').innerHTML = `⚙️ ${msg}`;
            }
        }).then(success => {
            let ov = document.getElementById('sync-overlay');
            if(ov) {
                if(success) {
                    ov.style.background = '#27ae60';
                    ov.innerHTML = '✅ Synced Successfully!';
                } else {
                    ov.style.background = '#e74c3c';
                    ov.innerHTML = '❌ Sync Failed!';
                }
                setTimeout(() => ov.remove(), 2000);
            }
            if(document.getElementById('bde-ui-level')) updateUIForRole();
        });
    }

    function initFloatingButton() {
        if (document.getElementById('bde-ghost-date-toggle')) return;
        let btn = document.createElement('button');
        btn.id = 'bde-ghost-date-toggle';
        btn.innerHTML = '📅 Branch Dates';
        btn.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#2980b9; color:white; border:none; padding:12px 18px; border-radius:50px; font-weight:bold; font-size:14px; box-shadow:0 4px 12px rgba(0,0,0,0.35); cursor:pointer; z-index:999999; transition:0.3s;';
        btn.onclick = openMainPanel;
        document.body.appendChild(btn);
    }

    function openMainPanel() {
        if (document.getElementById('bde-ghost-date-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'bde-ghost-date-panel';
        // Updated width and responsive constraints for Android mobile screen display
        panel.style.cssText = 'position: fixed; top: 30px; left: 50%; transform: translateX(-50%); background: #fff; border: 2px solid #2c3e50; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.4); width: 96vw; max-width: 680px; max-height: 88vh; display:flex; flex-direction:column; font-family: Arial; z-index: 999999; overflow: hidden;';

        document.body.appendChild(panel);

        panel.innerHTML = `
            <div id="bde-drag-header" style="background:#2c3e50; color:white; padding:12px 15px; display:flex; justify-content:space-between; align-items:center; cursor:move;">
                <strong style="font-size:14px;">📅 Branch Date Extractor V2.8 (Mobile)</strong>
                <button id="bde-close-date-panel" style="background:none; border:none; color:#e74c3c; font-size:18px; cursor:pointer; font-weight:bold;">✖</button>
            </div>

            <div style="padding:12px; overflow-y:auto; flex:1;">
                <div style="display:flex; gap:6px; margin-bottom:10px; align-items:flex-end; flex-wrap:wrap;">
                    <div style="flex:1; min-width:120px;">
                        <label style="font-size:11px; font-weight:bold;">📍 লেভেল:</label>
                        <select id="bde-ui-level" style="width:100%; padding:6px; border:1px solid #bdc3c7; border-radius:4px; margin-top:4px; font-size:12px;"></select>
                    </div>
                    <div style="flex:1; min-width:140px;">
                        <label style="font-size:11px; font-weight:bold;">🏢 নির্বাচন করুন:</label>
                        <select id="bde-ui-target" style="width:100%; padding:6px; border:1px solid #bdc3c7; border-radius:4px; margin-top:4px; font-size:12px;"></select>
                    </div>
                    <div>
                        <button id="bde-sync-btn" style="height:31px; width:35px; background:#bdc3c7; color:#2c3e50; border:none; border-radius:4px; cursor:pointer; font-weight:bold; font-size:13px;" title="ম্যানুয়াল সিঙ্ক">🔄</button>
                    </div>
                </div>

                <button id="bde-start-fetch-btn" style="width:100%; background:#27ae60; color:white; border:none; padding:10px; font-weight:bold; font-size:14px; border-radius:4px; cursor:pointer; margin-bottom:10px;">🚀 Fetch Dates (Auto Engine)</button>
                
                <div id="bde-status-msg" style="font-size:12px; font-weight:bold; color:#d35400; text-align:center; min-height:18px;"></div>
                
                <div id="bde-table-output" style="margin-top:10px; overflow-x:auto;"></div>
                
                <button id="bde-export-excel-btn" style="display:none; width:100%; background:#8e44ad; color:white; border:none; padding:10px; margin-top:10px; font-weight:bold; font-size:14px; border-radius:4px; cursor:pointer;">📥 Download Excel</button>
            </div>
        `;

        document.getElementById('bde-close-date-panel').onclick = () => panel.remove();
        makeDraggable(panel, document.getElementById('bde-drag-header'));
        document.getElementById('bde-ui-level').onchange = populateTargets;

        document.getElementById('bde-sync-btn').onclick = () => {
            document.getElementById('bde-status-msg').innerText = "⏳ ডাটাবেস সিঙ্ক হচ্ছে...";
            syncLocations((msg) => { document.getElementById('bde-status-msg').innerText = msg; }).then((success) => {
                if(success) {
                    document.getElementById('bde-status-msg').innerHTML = "<span style='color:green;'>✅ সিঙ্ক সফল!</span>";
                    updateUIForRole();
                } else {
                    document.getElementById('bde-status-msg').innerHTML = "<span style='color:red;'>❌ সিঙ্ক ব্যর্থ!</span>";
                }
            });
        };

        document.getElementById('bde-start-fetch-btn').onclick = startFetchingDates;

        document.getElementById('bde-export-excel-btn').onclick = () => {
            let table = document.querySelector("#bde-table-output table");
            if (!table) return;

            let clonedTable = table.cloneNode(true);
            let thead = clonedTable.querySelector('thead');
            if (thead) thead.style.position = 'static';

            let template = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                <head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Branch Dates</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
                <body>${clonedTable.outerHTML}</body>
                </html>
            `;

            let blob = new Blob([template], { type: 'application/vnd.ms-excel;charset=utf-8' });
            let url = URL.createObjectURL(blob);
            let link = document.createElement("a");
            link.href = url;
            link.download = `Branch_Dates_${new Date().toISOString().split('T')[0]}.xls`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        };

        if (localStorage.getItem('mf_cached_branches')) {
            updateUIForRole();
        } else {
            document.getElementById('bde-status-msg').innerHTML = "<span style='color:#2980b9;'>⏳ স্ক্যান চলছে, একটু অপেক্ষা করুন...</span>";
        }
    }

    function updateUIForRole() {
        let zones = JSON.parse(localStorage.getItem('mf_cached_zones') || '[]');
        let areas = JSON.parse(localStorage.getItem('mf_cached_areas') || '[]');
        let levelDropdown = document.getElementById('bde-ui-level');

        levelDropdown.innerHTML = '';
        if (zones.length > 0) levelDropdown.innerHTML += '<option value="3">জোন (Zone)</option>';
        if (areas.length > 0) levelDropdown.innerHTML += '<option value="2">অঞ্চল (Area)</option>';
        levelDropdown.innerHTML += '<option value="1">শাখা (Branch)</option>';

        populateTargets();
    }

    function populateTargets() {
        let level = document.getElementById('bde-ui-level').value;
        let targetSel = document.getElementById('bde-ui-target');
        targetSel.innerHTML = '<option value="ALL" data-name="ALL">🚀 Select All Branches</option>';

        let data = [];
        if (level === '3') data = JSON.parse(localStorage.getItem('mf_cached_zones') || '[]');
        else if (level === '2') data = JSON.parse(localStorage.getItem('mf_cached_areas') || '[]');
        else if (level === '1') data = JSON.parse(localStorage.getItem('mf_cached_branches') || '[]');

        data.forEach(item => {
            targetSel.innerHTML += `<option value="${item.id}" data-name="${item.name}">${item.name}</option>`;
        });
    }

    async function startFetchingDates() {
        let level = document.getElementById('bde-ui-level').value;
        let targetSel = document.getElementById('bde-ui-target');
        let targetId = targetSel.value;
        let targetName = targetSel.options[targetSel.selectedIndex].getAttribute('data-name');

        let allBranches = JSON.parse(localStorage.getItem('mf_cached_branches') || '[]');
        let branchesToProcess = [];

        if (targetId === 'ALL') {
            branchesToProcess = allBranches;
        } else {
            if (level === '3') branchesToProcess = allBranches.filter(b => b.zone === targetName);
            else if (level === '2') branchesToProcess = allBranches.filter(b => b.area === targetName);
            else if (level === '1') branchesToProcess = allBranches.filter(b => b.id === targetId);
        }

        if(branchesToProcess.length === 0) {
            alert("❌ কোনো শাখা পাওয়া যায়নি! দয়া করে ডানদিকের 🔄 বাটনে চাপ দিয়ে একবার সিঙ্ক করে নিন।");
            return;
        }

        let output = document.getElementById('bde-table-output');
        let startBtn = document.getElementById('bde-start-fetch-btn');
        let exportBtn = document.getElementById('bde-export-excel-btn');
        let statusElement = document.getElementById('bde-status-msg');

        if(startBtn) { startBtn.disabled = true; startBtn.style.background = "#7f8c8d"; }
        if(exportBtn) { exportBtn.style.display = 'none'; }

        let tableHtml = `
            <div style="max-height: 320px; overflow-y: auto; overflow-x: auto;">
            <table style="width:100%; border-collapse:collapse; font-size:11px; text-align:center;">
                <thead style="position: sticky; top: 0; z-index:1;">
                    <tr>
                        <th style="padding:6px 4px; border:1px solid #bdc3c7; background:#2c3e50; color:white;">Branch</th>
                        <th style="padding:6px 4px; border:1px solid #bdc3c7; background:#2980b9; color:white;">MIS</th>
                        <th style="padding:6px 4px; border:1px solid #bdc3c7; background:#2980b9; color:white;">Lag</th>
                        <th style="padding:6px 4px; border:1px solid #bdc3c7; background:#27ae60; color:white;">AIS</th>
                        <th style="padding:6px 4px; border:1px solid #bdc3c7; background:#27ae60; color:white;">Lag</th>
                    </tr>
                </thead>
        `;

        for(let b of branchesToProcess) {
            let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, '');
            tableHtml += `
                <tbody id="bde-tr-${safeId}">
                    <tr>
                        <td style="text-align:left; padding:6px 4px; border:1px solid #bdc3c7; font-weight:bold;">${b.name}</td>
                        <td colspan="4" style="padding:6px; border:1px solid #bdc3c7; color:gray;">⏳ অটো-ফেচিং চলছে...</td>
                    </tr>
                </tbody>
            `;
        }
        tableHtml += `</table></div>`;
        output.innerHTML = tableHtml;

        try {
            if(statusElement) statusElement.innerHTML = `<span style="color:#2980b9;">⏳ MIS ডাটা ব্যাকগ্রাউন্ডে স্ক্র্যাপ হচ্ছে...</span>`;
            let misDataMap = await fetchDatesViaInvisibleFrame('MIS', level, targetId, branchesToProcess);

            if(statusElement) statusElement.innerHTML = `<span style="color:#2980b9;">⏳ AIS ডাটা ব্যাকগ্রাউন্ডে স্ক্র্যাপ হচ্ছে...</span>`;
            let aisDataMap = await fetchDatesViaInvisibleFrame('AIS', level, targetId, branchesToProcess);

            for (let b of branchesToProcess) {
                let bCodeMatch = b.name.match(/(?:^|-|\s)(\d{3,4})(?:$|-|\s)/);
                let bCode = bCodeMatch ? bCodeMatch[1] : b.name.replace(/[^a-z]/gi, '').toLowerCase();

                let aisDate = aisDataMap[bCode] || "Not Found";
                let misDate = misDataMap[bCode] || "Not Found";

                let aisLag = calculateLag(aisDate);
                let misLag = calculateLag(misDate);

                let aisLagColor = aisLag > 2 ? '#c0392b' : (aisLag > 0 ? '#d35400' : '#27ae60');
                let misLagColor = misLag > 2 ? '#c0392b' : (misLag > 0 ? '#d35400' : '#27ae60');

                let isMismatch = (misDate !== "Not Found" && aisDate !== "Not Found" && misDate !== aisDate);
                let rowBg = isMismatch ? "background:#fdedec;" : "";

                let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, '');
                
                let trElement = document.getElementById(`bde-tr-${safeId}`);
                if (trElement) {
                    trElement.innerHTML = `
                        <tr style="${rowBg}">
                            <td style="text-align:left; padding:6px 4px; border:1px solid #bdc3c7; font-weight:bold; color:#2c3e50;">${b.name}</td>
                            <td style="padding:6px 4px; border:1px solid #bdc3c7; color:${misDate === 'Not Found'?'#e74c3c':'#2980b9'}; font-weight:bold; background:#f4f9f9;">${misDate}</td>
                            <td style="padding:6px 4px; border:1px solid #bdc3c7; color:${misLagColor}; font-weight:bold; background:#f4f9f9;">${misLag}</td>
                            <td style="padding:6px 4px; border:1px solid #bdc3c7; color:${aisDate === 'Not Found'?'#e74c3c':'#27ae60'}; font-weight:bold; background:#f9fbf9;">${aisDate}</td>
                            <td style="padding:6px 4px; border:1px solid #bdc3c7; color:${aisLagColor}; font-weight:bold; background:#f9fbf9;">${aisLag}</td>
                        </tr>
                    `;
                }
            }

            if(statusElement) statusElement.innerHTML = `<span style="color:green;">✅ সব শাখার ডেট ও Lag সফলভাবে স্ক্যান করা হয়েছে!</span>`;
            
        } catch(e) {
            console.error(e);
            if(statusElement) statusElement.innerHTML = `<span style="color:red;">❌ স্ক্যানিংয়ে একটি সমস্যা হয়েছে!</span>`;
        } finally {
            let finalStartBtn = document.getElementById('bde-start-fetch-btn');
            let finalExportBtn = document.getElementById('bde-export-excel-btn');

            if (finalStartBtn) {
                finalStartBtn.disabled = false; 
                finalStartBtn.removeAttribute('disabled');
                finalStartBtn.style.background = "#27ae60";
            }
            if (finalExportBtn) {
                finalExportBtn.style.display = 'block'; 
            }
        }
    }

    let hasSyncedThisPageLoad = false;

    setInterval(() => {
        let isDashboard = window.location.hash.includes('#/mis/dashboard') || window.location.hash.includes('#/ais/dashboard');
        
        let btn = document.getElementById('bde-ghost-date-toggle');
        let panel = document.getElementById('bde-ghost-date-panel');
        
        if (isDashboard) {
            if (!btn) initFloatingButton();
            
            if (!hasSyncedThisPageLoad) {
                hasSyncedThisPageLoad = true;
                performRoleWiseSync();
            }
        } else {
            hasSyncedThisPageLoad = false; 
            if (btn) btn.remove();
            if (panel) panel.remove();
        }
    }, 1500);

})();
