// ========================================================================
// EXTENSION 1: 📅 Branch Date Extractor V2.8 (Mobile)
// ========================================================================
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
        btn.style.cssText = 'position:fixed; bottom:110px; right:16px; background:#2980b9; color:white; border:none; padding:12px 18px; border-radius:50px; font-weight:bold; font-size:14px; box-shadow:0 4px 14px rgba(0,0,0,0.4); cursor:pointer; z-index:999999; transition:0.3s;';
        btn.onclick = openMainPanel;
        document.body.appendChild(btn);
    }

    function openMainPanel() {
        if (document.getElementById('bde-ghost-date-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'bde-ghost-date-panel';
        panel.style.cssText = 'position: fixed; top: 15px; bottom: 80px; left: 50%; transform: translateX(-50%); background: #fff; border: 2px solid #2c3e50; border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,0.45); width: 96vw; max-width: 680px; display:flex; flex-direction:column; font-family: Arial; z-index: 999999; overflow: hidden;';

        document.body.appendChild(panel);

        panel.innerHTML = `
            <div id="bde-drag-header" style="background:#2c3e50; color:white; padding:12px 15px; display:flex; justify-content:space-between; align-items:center; cursor:move; flex-shrink:0;">
                <strong style="font-size:14px;">📅 Branch Date Extractor V2.8 (Mobile)</strong>
                <button id="bde-close-date-panel" style="background:none; border:none; color:#e74c3c; font-size:18px; cursor:pointer; font-weight:bold;">✖</button>
            </div>

            <div style="padding:12px; display:flex; flex-direction:column; flex:1; overflow:hidden;">
                <div style="display:flex; gap:6px; margin-bottom:10px; align-items:flex-end; flex-wrap:wrap; flex-shrink:0;">
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

                <button id="bde-start-fetch-btn" style="width:100%; background:#27ae60; color:white; border:none; padding:10px; font-weight:bold; font-size:14px; border-radius:4px; cursor:pointer; margin-bottom:8px; flex-shrink:0;">🚀 Fetch Dates (Auto Engine)</button>
                
                <div id="bde-status-msg" style="font-size:12px; font-weight:bold; color:#d35400; text-align:center; min-height:18px; flex-shrink:0;"></div>
                
                <div id="bde-table-output" style="margin-top:8px; flex:1; overflow-y:auto; overflow-x:auto; border:1px solid #eaeaea; border-radius:4px;"></div>
                
                <button id="bde-export-excel-btn" style="display:none; width:100%; background:#8e44ad; color:white; border:none; padding:10px; margin-top:8px; font-weight:bold; font-size:14px; border-radius:4px; cursor:pointer; flex-shrink:0;">📥 Download Excel</button>
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

            let fileName = `Branch_Dates_${new Date().toISOString().split('T')[0]}.xls`;

            if (window.AndroidDownloader && window.AndroidDownloader.saveExcel) {
                window.AndroidDownloader.saveExcel(template, fileName);
            } else {
                let blob = new Blob([template], { type: 'application/vnd.ms-excel;charset=utf-8' });
                let url = URL.createObjectURL(blob);
                let link = document.createElement("a");
                link.href = url;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }
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
            <table style="width:100%; border-collapse:collapse; font-size:12px; text-align:center;">
                <thead style="position: sticky; top: 0; z-index:5;">
                    <tr>
                        <th style="padding:7px 5px; border:1px solid #bdc3c7; background:#2c3e50; color:white;">Branch</th>
                        <th style="padding:7px 5px; border:1px solid #bdc3c7; background:#2980b9; color:white;">MIS</th>
                        <th style="padding:7px 5px; border:1px solid #bdc3c7; background:#2980b9; color:white;">Lag</th>
                        <th style="padding:7px 5px; border:1px solid #bdc3c7; background:#27ae60; color:white;">AIS</th>
                        <th style="padding:7px 5px; border:1px solid #bdc3c7; background:#27ae60; color:white;">Lag</th>
                    </tr>
                </thead>
        `;

        for(let b of branchesToProcess) {
            let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, '');
            tableHtml += `
                <tbody id="bde-tr-${safeId}">
                    <tr>
                        <td style="text-align:left; padding:7px 5px; border:1px solid #bdc3c7; font-weight:bold;">${b.name}</td>
                        <td colspan="4" style="padding:7px; border:1px solid #bdc3c7; color:gray;">⏳ অটো-ফেচিং চলছে...</td>
                    </tr>
                </tbody>
            `;
        }
        tableHtml += `</table>`;
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
                            <td style="text-align:left; padding:7px 5px; border:1px solid #bdc3c7; font-weight:bold; color:#2c3e50;">${b.name}</td>
                            <td style="padding:7px 5px; border:1px solid #bdc3c7; color:${misDate === 'Not Found'?'#e74c3c':'#2980b9'}; font-weight:bold; background:#f4f9f9;">${misDate}</td>
                            <td style="padding:7px 5px; border:1px solid #bdc3c7; color:${misLagColor}; font-weight:bold; background:#f4f9f9;">${misLag}</td>
                            <td style="padding:7px 5px; border:1px solid #bdc3c7; color:${aisDate === 'Not Found'?'#e74c3c':'#27ae60'}; font-weight:bold; background:#f9fbf9;">${aisDate}</td>
                            <td style="padding:7px 5px; border:1px solid #bdc3c7; color:${aisLagColor}; font-weight:bold; background:#f9fbf9;">${aisLag}</td>
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

// ========================================================================
// EXTENSION 2: 🚀 Auditor Pro IT-Rameez (Mobile & PC)
// ========================================================================
(function() {
    'use strict';

    function getToday() {
        let d = new Date(), m = '' + (d.getMonth() + 1), day = '' + d.getDate();
        if (m.length < 2) m = '0' + m;
        if (day.length < 2) day = '0' + day;
        return [d.getFullYear(), m, day].join('-');
    }

    const formatNum = (num) => Number(num || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    function parseAis(doc) {
        let savings = 0, loan = 0, cashInHand = 0, cashAtBank = 0, equity = 0;
        try {
            doc.querySelectorAll('tr').forEach(tr => {
                let rowText = (tr.textContent || "").toLowerCase();
                let cells = tr.querySelectorAll('td, th');
                if (cells.length >= 3) {
                    let val = parseFloat(cells[1].textContent.replace(/[^\d.-]/g, '')) || 0;
                    if (rowText.includes('members savings deposit')) savings = val;
                    else if (rowText.includes('loan to beneficiries') || rowText.includes('loan to members') || rowText.includes('[127000]')) loan = val;
                    else if (rowText.includes('cash in hand') && rowText.includes('[132000]')) cashInHand = val;
                    else if (rowText.includes('cash at bank') && rowText.includes('[134000]')) cashAtBank = val;
                    else if (rowText.includes('total equity/capital fund')) equity = val;
                }
            });
        } catch(e) {}
        return { savings, loan, cashInHand, cashAtBank, equity };
    }

    function parseMis(doc) {
        let savings = 0, loan = 0;
        try {
            let allElements = doc.querySelectorAll('b, span, div, th, td');
            for (let el of allElements) {
                if (el.textContent && el.textContent.includes('Grand Total Saving Balance')) {
                    let valStr = el.textContent.split('Grand Total Saving Balance')[1] || el.textContent;
                    let match = valStr.match(/[\d,]+(\.\d{2})?/);
                    if (match) savings = parseFloat(match[0].replace(/[^\d.-]/g, '')) || 0;
                }
            }

            let rows = doc.querySelectorAll('tr');
            for (let tr of rows) {
                if (tr.textContent && tr.textContent.includes('Total :') && !tr.textContent.includes('Grand')) {
                    let cells = tr.querySelectorAll('td, th');
                    let financials = [];
                    cells.forEach(cell => {
                        let txt = cell.textContent.trim();
                        if (txt.includes('.')) {
                            let num = parseFloat(txt.replace(/[^\d.-]/g, ''));
                            if (!isNaN(num)) financials.push(num);
                        }
                    });
                    if (financials.length >= 3) { loan = financials[2]; break; }
                }
            }
        } catch(e) {}
        return { savings, loan };
    }

    function triggerVueChange(el, value, win) {
        if (!el) return;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        if (win && win.jQuery) win.jQuery(el).trigger('change');
    }

    async function waitForOptions(doc, selector, minLen = 1) {
        for(let i=0; i<40; i++) {
            let el = doc.querySelector(selector);
            if (el && el.options.length > minLen) return el;
            await new Promise(r => setTimeout(r, 500));
        }
        return doc.querySelector(selector);
    }

    function syncLocations(statusCallback) {
        return new Promise((resolve) => {
            let iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed; top:0; left:-9999px; width:1200px; height:800px; border:none; z-index:-1;';
            iframe.src = window.location.origin + window.location.pathname + '#/reports/po-mis-reports/po-mis-1-index';
            document.body.appendChild(iframe);

            let timeout = setTimeout(() => { iframe.remove(); resolve(false); }, 60000); 

            iframe.onload = () => {
                statusCallback("সিস্টেম স্ক্যান করা হচ্ছে...");
                
                setTimeout(async () => {
                    try {
                        let doc = iframe.contentDocument || iframe.contentWindow.document;
                        let win = iframe.contentWindow;
                        
                        let reportLvl = null, branchSel = null;
                        
                        for (let i = 0; i < 40; i++) {
                            reportLvl = doc.querySelector('select[name="cbo_report_level"]');
                            branchSel = doc.querySelector('select[name="cbo_branch"]');
                            if (reportLvl || branchSel) break;
                            await new Promise(r => setTimeout(r, 500));
                        }

                        if (reportLvl) {
                            localStorage.setItem('mf_user_type', 'HO');
                            statusCallback("জোন সিঙ্ক হচ্ছে...");
                            
                            let zones = [], areas = [], branches = [];
                            let zMap = {}, aMap = {};

                            let hasZone = Array.from(reportLvl.options).some(o => o.value === '3');
                            if (hasZone) {
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

                            statusCallback("অঞ্চল সিঙ্ক হচ্ছে...");
                            let hasArea = Array.from(reportLvl.options).some(o => o.value === '2');
                            if (hasArea) {
                                triggerVueChange(reportLvl, '2', win);
                                await new Promise(r => setTimeout(r, 800));
                                let areaSel = await waitForOptions(doc, 'select[name="cbo_area"]');
                                if (areaSel) {
                                    let currentArea = "Unknown Area";
                                    Array.from(areaSel.options).forEach(opt => {
                                        if (opt.value && opt.value !== '-1' && !opt.text.includes('--')) {
                                            if (!opt.disabled && !opt.value.includes('@@@')) {
                                                currentArea = opt.text.trim();
                                                let parentZone = zMap[currentArea] || "Unknown Zone";
                                                areas.push({id: opt.value, name: currentArea, zone: parentZone});
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

                            statusCallback("শাখা সিঙ্ক হচ্ছে...");
                            let hasBranch = Array.from(reportLvl.options).some(o => o.value === '1');
                            if (hasBranch) {
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
                                                let bZone = zMap[bArea] || "Unknown Zone";
                                                branches.push({id: bId, name: bName, area: bArea, zone: bZone});
                                            }
                                        }
                                    });
                                }
                            }

                            localStorage.setItem('mf_cached_zones', JSON.stringify(zones));
                            localStorage.setItem('mf_cached_areas', JSON.stringify(areas));
                            localStorage.setItem('mf_cached_branches', JSON.stringify(branches));
                        } 
                        else if (branchSel) {
                            localStorage.setItem('mf_user_type', 'AREA');
                            statusCallback("শাখা সিঙ্ক হচ্ছে...");
                            
                            let branches = [];
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
                            localStorage.setItem('mf_cached_branches', JSON.stringify(branches));
                        } 
                        else {
                            localStorage.setItem('mf_user_type', 'BRANCH');
                            statusCallback("সিস্টেম প্রস্তুত!");
                            localStorage.setItem('mf_cached_branches', JSON.stringify([{id: 'SELF', name: 'My Branch'}]));
                        }
                        
                        clearTimeout(timeout); iframe.remove(); resolve(true);
                    } catch(e) { clearTimeout(timeout); iframe.remove(); resolve(false); }
                }, 2000);
            };
        });
    }

    function scrapeViaGhost(hashUrl, targetDate, reportLevel, targetId, type, statusCallback) {
        return new Promise((resolve) => {
            let iframe = document.createElement('iframe');
            iframe.style.cssText = 'position:fixed; top:0; left:-9999px; width:1200px; height:800px; border:none; z-index:-1;';
            iframe.src = window.location.origin + window.location.pathname + hashUrl;
            document.body.appendChild(iframe);

            let timeout = setTimeout(() => {
                if(document.body.contains(iframe)) iframe.remove();
                resolve(null);
            }, 60000); 

            let isProcessed = false;
            let uType = localStorage.getItem('mf_user_type') || 'HO';

            iframe.onload = () => {
                if(isProcessed) return;
                
                setTimeout(async () => {
                    try {
                        let doc = iframe.contentDocument || iframe.contentWindow.document;
                        let win = iframe.contentWindow;
                        let btn = doc.querySelector('button[type="submit"]') || doc.querySelector('.rep_btn button.btn-primary');

                        if (uType === 'HO') {
                            let reportLvlDropdown = doc.querySelector('select[name="cbo_report_level"]');
                            if (reportLvlDropdown) {
                                triggerVueChange(reportLvlDropdown, reportLevel, win);
                                await new Promise(r => setTimeout(r, 1000)); 
                            }
                            let targetSelector = reportLevel === '3' ? 'select[name="cbo_zone"]' : (reportLevel === '2' ? 'select[name="cbo_area"]' : 'select[name="cbo_branch"]');
                            let targetSel = await waitForOptions(doc, targetSelector);
                            if (targetSel && targetId !== 'ALL') {
                                triggerVueChange(targetSel, targetId, win);
                                await new Promise(r => setTimeout(r, 1000)); 
                            }
                        } 
                        else if (uType === 'AREA') {
                            let targetSel = await waitForOptions(doc, 'select[name="cbo_branch"]');
                            if (targetSel && targetId !== 'ALL') {
                                triggerVueChange(targetSel, targetId, win);
                                await new Promise(r => setTimeout(r, 1000)); 
                            }
                        }

                        if (type === 'mis') {
                            let samitySel = doc.querySelector('select[name="cbo_samity"]');
                            if (samitySel) {
                                triggerVueChange(samitySel, "-1", win); 
                                await new Promise(r => setTimeout(r, 500));
                            }
                        }

                        triggerVueChange(doc.querySelector('select[name="cbo_service_charge"]'), "1", win);
                        triggerVueChange(doc.querySelector('select[name="cbo_funding_organization"]'), "-1", win);

                        if(type === 'mis') {
                            triggerVueChange(doc.querySelector('input[name="txt_date"]'), targetDate, win);
                            
                            setTimeout(() => {
                                btn.dispatchEvent(new MouseEvent('click', { view: win, bubbles: true, cancelable: true }));
                                btn.click();
                                
                                let poll = setInterval(() => {
                                    if (doc.body.textContent.includes('Saving Balance')) {
                                        clearInterval(poll); clearTimeout(timeout); isProcessed = true;
                                        let data = parseMis(doc);
                                        iframe.remove(); resolve(data);
                                    }
                                }, 1000);
                            }, 1500);
                        } 
                        else if (type === 'ais') {
                            let dateInputAis = doc.querySelector('input[name="txt_as_on_date"]');
                            if(dateInputAis) triggerVueChange(dateInputAis, targetDate, win);

                            let checkbox = doc.getElementById('chk_show_ledger_code1');
                            let checkLabel = doc.querySelector('label[for="chk_show_ledger_code1"]');
                            
                            if (checkbox && !checkbox.checked) {
                                if (checkLabel) checkLabel.dispatchEvent(new MouseEvent('click', { view: win, bubbles: true }));
                                else checkbox.click();
                                checkbox.checked = true;
                                triggerVueChange(checkbox, "1", win);
                            }

                            setTimeout(() => {
                                btn.dispatchEvent(new MouseEvent('click', { view: win, bubbles: true, cancelable: true }));
                                btn.click();
                                
                                let poll = setInterval(() => {
                                    if (doc.body.textContent.includes('Members Savings Deposit') && doc.body.textContent.includes('[132000]')) {
                                        clearInterval(poll); clearTimeout(timeout); isProcessed = true;
                                        let data = parseAis(doc);
                                        iframe.remove(); resolve(data);
                                    }
                                }, 1000);
                            }, 1500);
                        }
                    } catch(e) { clearTimeout(timeout); iframe.remove(); resolve(null); }
                }, 3000);
            };
        });
    }

    function initDashboard() {
        if (!window.location.hash.includes('dashboard')) return;
        if (document.getElementById('ghost-audit-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'ghost-audit-panel';
        panel.style.cssText = 'position: fixed; top: 75px; left: 50%; transform: translateX(-50%); background: #fff; border: 2px solid #2c3e50; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.45); width: 190px; font-family: Arial; z-index: 999998; overflow: hidden; transition: width 0.3s ease, max-width 0.3s ease;';
        document.body.appendChild(panel);

        panel.innerHTML = `
            <div id="ghost-header" style="background:#2c3e50; color:white; padding:10px 12px; cursor:move; display:flex; justify-content:space-between; align-items:center;">
                <strong id="panel-title" style="font-size:13px; pointer-events:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">🚀 Auditor Pro-IT Rameez</strong>
                <div style="display:flex; align-items:center; gap:5px;">
                    <button id="sync-locations-btn" style="display:none; background:#f39c12; border:none; color:white; font-size:11px; cursor:pointer; padding:3px 6px; border-radius:3px; font-weight:bold; white-space:nowrap;">🔄 Sync</button>
                    <button id="ghost-min" style="background:none; border:none; color:white; font-size:16px; cursor:pointer; padding:0 3px; font-weight:bold;">➕</button>
                    <button id="ghost-close" style="background:none; border:none; color:#e74c3c; font-size:14px; cursor:pointer; padding:0 3px;">✖</button>
                </div>
            </div>
            
            <div id="ghost-body" style="padding:12px; overflow-y:auto; max-height: 80vh; display: none;">
                <div style="display:flex; gap:8px; margin-bottom:12px; align-items:flex-end; flex-wrap:wrap;" id="controls-container">
                </div>
                <button id="start-audit-btn" style="width:100%; background:#27ae60; color:white; border:none; padding:10px; font-weight:bold; font-size:14px; border-radius:4px; cursor:pointer; transition:0.3s;">🚀 Start Audit Process</button>
                <div id="audit-status" style="margin-top:10px; font-size:12px; font-weight:bold; color:#d35400; text-align:center; min-height:16px;"></div>
                <div id="audit-output" style="margin-top:10px;"></div>
                <button id="export-excel-btn" style="display:none; width:100%; background:#8e44ad; color:white; border:none; padding:10px; margin-top:10px; font-weight:bold; font-size:14px; border-radius:4px; cursor:pointer; transition:0.3s;">📥 Download Excel</button>
            </div>
        `;

        let isExpanded = false;
        
        function togglePanel(forceExpand = null) {
            let body = document.getElementById('ghost-body');
            let syncBtn = document.getElementById('sync-locations-btn');
            let minBtn = document.getElementById('ghost-min');
            let title = document.getElementById('panel-title');
            
            if (forceExpand !== null) isExpanded = !forceExpand;
            
            if (!isExpanded) {
                // Expand (Mobile optimized size)
                panel.style.width = '94vw';
                panel.style.maxWidth = '640px';
                body.style.display = 'block';
                syncBtn.style.display = 'inline-block';
                minBtn.innerText = '−';
                title.innerText = "🚀 Auditor Pro IT-Rameez";
                isExpanded = true;
            } else {
                // Minimize
                panel.style.width = '190px';
                panel.style.maxWidth = '190px';
                body.style.display = 'none';
                syncBtn.style.display = 'none';
                minBtn.innerText = '➕';
                
                let uType = localStorage.getItem('mf_user_type');
                if(uType === 'BRANCH') title.innerText = "🚀 Branch Pro";
                else if(uType === 'AREA') title.innerText = "🚀 Area Pro";
                else title.innerText = "🚀 Auditor Pro IT-Rameez";
                
                isExpanded = false;
            }
        }

        document.getElementById('ghost-min').onclick = () => togglePanel();
        document.getElementById('ghost-close').onclick = () => panel.remove();

        function renderUI() {
            let uType = localStorage.getItem('mf_user_type');
            let container = document.getElementById('controls-container');
            let dateHtml = `
                <div style="flex:1; min-width:130px;">
                    <label style="font-size:11px; font-weight:bold; color:#34495e;">📅 রিপোর্ট তারিখ:</label>
                    <input type="date" id="custom-audit-date" style="width:100%; padding:6px; border:1px solid #bdc3c7; border-radius:4px; font-family:Arial; cursor:pointer; margin-top:4px; font-size:12px;" value="${getToday()}">
                </div>
            `;

            if (uType === 'BRANCH') {
                document.getElementById('panel-title').innerText = isExpanded ? "🚀 Branch Auditor Pro" : "🚀 Branch Pro";
                container.innerHTML = dateHtml; 
            } 
            else if (uType === 'AREA') {
                document.getElementById('panel-title').innerText = isExpanded ? "🚀 Area Auditor Pro" : "🚀 Area Pro";
                container.innerHTML = `
                    <div style="flex:2; min-width:150px;">
                        <label style="font-size:11px; font-weight:bold; color:#34495e;">🏢 নির্বাচন করুন:</label>
                        <select id="custom-target" style="width:100%; padding:6px; border:1px solid #bdc3c7; border-radius:4px; margin-top:4px; font-size:12px;">
                            <option value="ALL">-- 🚀 Run All Branches (Batch) --</option>
                        </select>
                    </div>
                    ${dateHtml}
                `;
                populateTargets();
            } 
            else { 
                let zones = JSON.parse(localStorage.getItem('mf_cached_zones') || '[]');
                let areas = JSON.parse(localStorage.getItem('mf_cached_areas') || '[]');
                
                let levelOptions = `<option value="1">শাখা (Branch)</option>`;
                if (areas.length > 0) levelOptions += `<option value="2">অঞ্চল (Area)</option>`;
                if (zones.length > 0) levelOptions += `<option value="3" selected>জোন (Zone)</option>`;
                else if (areas.length > 0) levelOptions = levelOptions.replace('value="2"', 'value="2" selected');
                else levelOptions = levelOptions.replace('value="1"', 'value="1" selected');

                document.getElementById('panel-title').innerText = "🚀 Auditor Pro IT-Rameez";
                container.innerHTML = `
                    <div style="flex:1; min-width:110px;">
                        <label style="font-size:11px; font-weight:bold; color:#34495e;">📍 লেভেল:</label>
                        <select id="custom-level" style="width:100%; padding:6px; border:1px solid #bdc3c7; border-radius:4px; margin-top:4px; font-size:12px;">
                            ${levelOptions}
                        </select>
                    </div>
                    <div style="flex:1.5; min-width:140px;">
                        <label style="font-size:11px; font-weight:bold; color:#34495e;">🏢 নির্বাচন করুন:</label>
                        <select id="custom-target" style="width:100%; padding:6px; border:1px solid #bdc3c7; border-radius:4px; margin-top:4px; font-size:12px;">
                        </select>
                    </div>
                    ${dateHtml}
                `;
                document.getElementById('custom-level').onchange = populateTargets;
                populateTargets();
            }
        }

        function populateTargets() {
            let targetSel = document.getElementById('custom-target');
            if(!targetSel) return;
            
            let uType = localStorage.getItem('mf_user_type');
            let data = [];

            if (uType === 'BRANCH') return;

            let level = document.getElementById('custom-level') ? document.getElementById('custom-level').value : '1';
            
            targetSel.innerHTML = '<option value="ALL" selected>🚀 Select All</option>';
            
            if (uType === 'AREA') {
                data = JSON.parse(localStorage.getItem('mf_cached_branches') || '[]');
            } else {
                if (level === '3') data = JSON.parse(localStorage.getItem('mf_cached_zones') || '[]');
                else if (level === '2') data = JSON.parse(localStorage.getItem('mf_cached_areas') || '[]');
                else if (level === '1') data = JSON.parse(localStorage.getItem('mf_cached_branches') || '[]');
            }
            
            if(data.length > 0) {
                data.forEach(item => { targetSel.innerHTML += `<option value="${item.id}">${item.name}</option>`; });
            }
        }

        if(!sessionStorage.getItem('mf_auto_synced') || !localStorage.getItem('mf_user_type')) {
            sessionStorage.setItem('mf_auto_synced', 'true');
            
            document.getElementById('panel-title').innerText = "⏳ Syncing...";
            document.getElementById('audit-status').innerHTML = `<span style="color:#f39c12;">⏳ অটো সিংক হচ্ছে...</span>`;
            document.getElementById('start-audit-btn').disabled = true;

            syncLocations((msg) => { 
                let st = document.getElementById('audit-status');
                if(st) st.innerText = msg;
                let pt = document.getElementById('panel-title');
                if(!isExpanded && pt) pt.innerText = "⏳ " + msg;
            }).then((success) => {
                renderUI();
                let saBtn = document.getElementById('start-audit-btn');
                if(saBtn) saBtn.disabled = false;
                
                let ast = document.getElementById('audit-status');
                let pt = document.getElementById('panel-title');
                
                if(success) {
                    if(ast) ast.innerText = "✅ অটো সিংক সম্পন্ন!";
                    if(!isExpanded && pt) pt.innerText = "✅ সিংক সম্পন্ন!";
                } else {
                    if(ast) ast.innerHTML = "<span style='color:red;'>❌ সিংক ব্যর্থ!</span>";
                    if(!isExpanded && pt) pt.innerText = "❌ সিংক ব্যর্থ!";
                }
                
                setTimeout(() => {
                    let pt2 = document.getElementById('panel-title');
                    if(!isExpanded && pt2) {
                        let uType = localStorage.getItem('mf_user_type');
                        if(uType === 'BRANCH') pt2.innerText = "🚀 Branch Pro";
                        else if(uType === 'AREA') pt2.innerText = "🚀 Area Pro";
                        else pt2.innerText = "🚀 Auditor Pro IT-Rameez";
                    }
                }, 2000);
            });
        } else {
            renderUI();
        }

        document.getElementById('sync-locations-btn').onclick = () => {
            togglePanel(true);
            document.getElementById('audit-status').innerHTML = `<span style="color:#f39c12;">⏳ সিংক হচ্ছে, অপেক্ষা করুন...</span>`;
            document.getElementById('start-audit-btn').disabled = true;
            document.getElementById('export-excel-btn').style.display = 'none';
            
            syncLocations((msg) => { 
                let st = document.getElementById('audit-status');
                if(st) st.innerText = msg; 
            }).then((success) => {
                renderUI();
                let saBtn = document.getElementById('start-audit-btn');
                if(saBtn) saBtn.disabled = false;
                
                let st = document.getElementById('audit-status');
                if(st) {
                    if(success) st.innerText = "✅ সিংক সফল হয়েছে!";
                    else st.innerHTML = "<span style='color:red;'>❌ সিংক ব্যর্থ!</span>";
                }
            });
        };

        let isDragging = false, initialX, initialY;
        const header = document.getElementById('ghost-header');

        header.addEventListener('mousedown', (e) => {
            let rect = panel.getBoundingClientRect();
            initialX = e.clientX - rect.left;
            initialY = e.clientY - rect.top;
            if (e.target === header || e.target.parentNode === header || e.target.id === 'panel-title') {
                isDragging = true;
            }
        });
        document.addEventListener('mouseup', () => { isDragging = false; });
        document.addEventListener('mousemove', (e) => {
            if (isDragging) {
                e.preventDefault();
                panel.style.left = (e.clientX - initialX) + 'px';
                panel.style.top = (e.clientY - initialY) + 'px';
                panel.style.transform = 'none'; 
            }
        });

        document.getElementById('export-excel-btn').onclick = () => {
            let table = document.querySelector('.audit-table');
            if(!table) return;

            let clone = table.cloneNode(true);
            clone.querySelectorAll('.manual-retry-btn').forEach(btn => btn.remove());
            clone.querySelectorAll('th, td').forEach(cell => {
                cell.style.border = "1px solid #000000";
            });

            let html = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                <head><meta charset="UTF-8"></head>
                <body>${clone.outerHTML}</body>
                </html>
            `;
            
            let uType = localStorage.getItem('mf_user_type');
            let targetName = "Branch";
            if(uType !== 'BRANCH') {
                let targetSel = document.getElementById('custom-target');
                targetName = targetSel.options[targetSel.selectedIndex].text;
                if(targetSel.value === 'ALL') targetName = "All_Batch";
            }
            
            let targetDate = document.getElementById('custom-audit-date').value;
            let fileName = `Audit_Report_${targetName.replace(/\s+/g, '_')}_${targetDate}.xls`;

            if (window.AndroidDownloader && window.AndroidDownloader.saveExcel) {
                window.AndroidDownloader.saveExcel(html, fileName);
            } else {
                let blob = new Blob([html], {type: 'application/vnd.ms-excel'});
                let a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(a.href);
            }
        };

        panel.addEventListener('click', async (e) => {
            if(e.target && e.target.classList.contains('manual-retry-btn')) {
                let btnTarget = e.target;
                let bId = btnTarget.getAttribute('data-id');
                let bName = btnTarget.getAttribute('data-name');
                let safeId = bId.toString().replace(/[^a-zA-Z0-9]/g, '');
                let sDate = document.getElementById('custom-audit-date').value;
                
                let tbody = document.getElementById(`tbody-${safeId}`);
                if(!tbody) return;

                tbody.innerHTML = `
                    <tr>
                        <td style="text-align:left; font-weight:bold; color:#e67e22;">${bName}</td>
                        <td colspan="4" style="text-align:center; color:#d35400; font-size:11px;">🔄 ম্যানুয়াল রিট্রাই চলছে (অপেক্ষা করুন)...</td>
                    </tr>
                `;

                const updateStatus = (msg) => { 
                    let stEl = document.getElementById('status-text');
                    if(stEl) stEl.innerText = msg; 
                };

                updateStatus(`ম্যানুয়াল রিট্রাই: ${bName}...`);

                let mData = await scrapeViaGhost('#/reports/member-migration-balances/member-migration-balance-index', sDate, '1', bId, 'mis', updateStatus);
                let aData = null;
                
                if (mData) {
                    let t2 = document.getElementById(`tbody-${safeId}`);
                    if(t2) t2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9;">${bName}</td><td colspan="4" style="text-align:center; color:#27ae60; font-size:11px;">🔄 MIS ডান! AIS ডাটা রিড করা হচ্ছে...</td></tr>`;
                    
                    aData = await scrapeViaGhost('#/reports/acc-balance-sheets/balance-sheet-report-filter', sDate, '1', bId, 'ais', updateStatus);
                }

                let tbodyAfter = document.getElementById(`tbody-${safeId}`);
                if(!tbodyAfter) return;

                if (mData && aData) {
                    let lDiff = (mData.loan || 0) - (aData.loan || 0);
                    let sDiff = (mData.savings || 0) - (aData.savings || 0);
                    
                    tbodyAfter.innerHTML = `
                        <tr>
                            <td rowspan="5" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; background:#f4f9f4;">${bName}</td>
                            <td style="text-align:left;"><b>Loan</b></td>
                            <td>${formatNum(mData.loan)}</td>
                            <td>${formatNum(aData.loan)}</td>
                            <td style="color:${lDiff===0?'green':'red'}; font-weight:bold;">${formatNum(lDiff)}</td>
                        </tr>
                        <tr>
                            <td style="text-align:left;"><b>Savings</b></td>
                            <td>${formatNum(mData.savings)}</td>
                            <td>${formatNum(aData.savings)}</td>
                            <td style="color:${sDiff===0?'green':'red'}; font-weight:bold;">${formatNum(sDiff)}</td>
                        </tr>
                        <tr style="background:#fcfcfc;">
                            <td style="text-align:left; color:#2c3e50;"><b>Cash in Hand</b></td>
                            <td style="color:gray;">-</td>
                            <td style="color:#16a085; font-weight:bold;">${formatNum(aData.cashInHand)}</td>
                            <td style="color:gray;">-</td>
                        </tr>
                        <tr style="background:#fcfcfc;">
                            <td style="text-align:left; color:#2c3e50;"><b>Cash at Bank</b></td>
                            <td style="color:gray;">-</td>
                            <td style="color:#16a085; font-weight:bold;">${formatNum(aData.cashAtBank)}</td>
                            <td style="color:gray;">-</td>
                        </tr>
                        <tr style="background:#fcfcfc;">
                            <td style="text-align:left; color:#2c3e50;"><b>Total Equity</b></td>
                            <td style="color:gray;">-</td>
                            <td style="color:#8e44ad; font-weight:bold;">${formatNum(aData.equity)}</td>
                            <td style="color:gray;">-</td>
                        </tr>
                    `;
                    updateStatus(`✅ ম্যানুয়াল রিট্রাই সফল!`);
                } else {
                    tbodyAfter.innerHTML = `
                        <tr>
                            <td style="text-align:left; font-weight:bold; color:#e74c3c;">${bName}</td>
                            <td colspan="3" style="text-align:center; color:red; font-size:11px;">❌ রিট্রাই ব্যর্থ!</td>
                            <td style="text-align:center;">
                                <button class="manual-retry-btn" data-id="${bId}" data-name="${bName}" style="background:#e74c3c; color:white; border:none; padding:3px 8px; font-size:10px; border-radius:3px; cursor:pointer;">🔄 Retry</button>
                            </td>
                        </tr>
                    `;
                    updateStatus(`❌ ম্যানুয়াল রিট্রাই ব্যর্থ!`);
                }
            }
        });

        const btn = document.getElementById('start-audit-btn');
        const status = document.getElementById('audit-status');
        const output = document.getElementById('audit-output');

        btn.onclick = async () => {
            let selectedDate = document.getElementById('custom-audit-date').value;
            let uType = localStorage.getItem('mf_user_type');
            
            let reportLevel = '1';
            let targetId = 'SELF';
            let targetName = 'My Branch';
            let isBatchMode = false;
            let branchesToProcess = [];

            if (uType === 'HO') {
                reportLevel = document.getElementById('custom-level').value;
                let targetSel = document.getElementById('custom-target');
                targetId = targetSel.value;
                targetName = targetSel.options[targetSel.selectedIndex].text;
                
                if (targetId === 'ALL') {
                    isBatchMode = true;
                    if (reportLevel === '3') branchesToProcess = JSON.parse(localStorage.getItem('mf_cached_branches') || '[]');
                    else if (reportLevel === '2') branchesToProcess = JSON.parse(localStorage.getItem('mf_cached_branches') || '[]');
                    else if (reportLevel === '1') branchesToProcess = JSON.parse(localStorage.getItem('mf_cached_branches') || '[]');
                } else {
                    if (reportLevel === '1') isBatchMode = false;
                    else {
                        isBatchMode = true;
                        let allBranches = JSON.parse(localStorage.getItem('mf_cached_branches') || '[]');
                        if (reportLevel === '3') branchesToProcess = allBranches.filter(b => b.zone === targetName || b.zone === targetId);
                        else if (reportLevel === '2') branchesToProcess = allBranches.filter(b => b.area === targetName || b.area === targetId);
                    }
                }
            } 
            else if (uType === 'AREA') {
                let targetSel = document.getElementById('custom-target');
                targetId = targetSel.value;
                targetName = targetSel.options[targetSel.selectedIndex].text;

                if (targetId === 'ALL') {
                    isBatchMode = true;
                    branchesToProcess = JSON.parse(localStorage.getItem('mf_cached_branches') || '[]');
                } else {
                    isBatchMode = false;
                }
            } 
            else if (uType === 'BRANCH') {
                isBatchMode = false;
                targetId = 'SELF';
            }

            if(isBatchMode && branchesToProcess.length === 0) {
                alert("❌ কোনো শাখা পাওয়া যায়নি! দয়া করে 'Sync' এ ক্লিক করুন।");
                return;
            }

            btn.disabled = true;
            btn.style.background = "#7f8c8d";
            document.getElementById('export-excel-btn').style.display = 'none';
            output.innerHTML = "";
            
            status.innerHTML = `<div style="display:inline-block; width:12px; height:12px; border:2px solid #f3f3f3; border-top:2px solid #d35400; border-radius:50%; animation:spin 1s linear infinite; vertical-align:middle; margin-right:5px;"></div> <span id="status-text">প্রসেসিং শুরু হচ্ছে...</span>`;
            
            const updateStatus = (msg) => { 
                let stEl = document.getElementById('status-text');
                if(stEl) stEl.innerText = msg; 
            };

            const tableStyle = `
                <style>
                    .audit-table { width:100%; border-collapse:collapse; font-size:11px; text-align:right; }
                    .audit-table th { border: 1px solid #bdc3c7; padding: 4px; white-space: nowrap; }
                    .audit-table td { border: 1px solid #bdc3c7; padding: 4px; }
                    .audit-table tbody { border-bottom: 2px solid #2c3e50; }
                </style>
            `;

            if (!isBatchMode) {
                let misData = await scrapeViaGhost('#/reports/member-migration-balances/member-migration-balance-index', selectedDate, reportLevel, targetId, 'mis', updateStatus);
                
                if(!misData) {
                    updateStatus(`🔄 MIS ডাটা ফেইল করেছে! পুনরায় চেষ্টা করা হচ্ছে...`);
                    misData = await scrapeViaGhost('#/reports/member-migration-balances/member-migration-balance-index', selectedDate, reportLevel, targetId, 'mis', updateStatus);
                }

                let aisData = null;
                if(misData) {
                    aisData = await scrapeViaGhost('#/reports/acc-balance-sheets/balance-sheet-report-filter', selectedDate, reportLevel, targetId, 'ais', updateStatus);
                    
                    if(!aisData) {
                        updateStatus(`🔄 AIS ডাটা ফেইল করেছে! পুনরায় চেষ্টা করা হচ্ছে...`);
                        aisData = await scrapeViaGhost('#/reports/acc-balance-sheets/balance-sheet-report-filter', selectedDate, reportLevel, targetId, 'ais', updateStatus);
                    }
                }

                let finalStatus = document.getElementById('audit-status');
                let finalBtn = document.getElementById('start-audit-btn');
                let finalOutput = document.getElementById('audit-output');

                if(!misData || !aisData) {
                    if(finalStatus) finalStatus.innerHTML = `<span style="color:red;">❌ অডিট ব্যর্থ! ডাটা পাওয়া যায়নি।</span>`;
                    if(finalBtn) { finalBtn.disabled = false; finalBtn.style.background = "#27ae60"; }
                    return;
                }

                if(finalStatus) finalStatus.innerHTML = `<span style="color:green;">✅ অডিট সফল!</span>`;
                if(finalBtn) { finalBtn.disabled = false; finalBtn.style.background = "#27ae60"; }

                let loanDiff = (misData.loan || 0) - (aisData.loan || 0);
                let savDiff = (misData.savings || 0) - (aisData.savings || 0);

                if(finalOutput) {
                    finalOutput.innerHTML = tableStyle + `
                        <div style="max-height:400px; overflow-y:auto; overflow-x:auto;">
                        <table class="audit-table">
                            <thead style="background:#2c3e50; color:white; position:sticky; top:0; z-index:1;">
                                <tr>
                                    <th style="text-align:left;">Branch Name</th>
                                    <th style="text-align:left;">Particulars</th>
                                    <th>MIS Balance</th>
                                    <th>AIS (Current)</th>
                                    <th>Difference</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td rowspan="5" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; background:#f4f9f4;">${targetName}</td>
                                    <td style="text-align:left;"><b>Loan</b></td>
                                    <td>${formatNum(misData.loan)}</td>
                                    <td>${formatNum(aisData.loan)}</td>
                                    <td style="color:${loanDiff===0?'green':'red'}; font-weight:bold;">${formatNum(loanDiff)}</td>
                                </tr>
                                <tr>
                                    <td style="text-align:left;"><b>Savings</b></td>
                                    <td>${formatNum(misData.savings)}</td>
                                    <td>${formatNum(aisData.savings)}</td>
                                    <td style="color:${savDiff===0?'green':'red'}; font-weight:bold;">${formatNum(savDiff)}</td>
                                </tr>
                                <tr style="background:#fcfcfc;">
                                    <td style="text-align:left; color:#2c3e50;"><b>Cash in Hand</b></td>
                                    <td style="color:gray;">-</td>
                                    <td style="color:#16a085; font-weight:bold;">${formatNum(aisData.cashInHand)}</td>
                                    <td style="color:gray;">-</td>
                                </tr>
                                <tr style="background:#fcfcfc;">
                                    <td style="text-align:left; color:#2c3e50;"><b>Cash at Bank</b></td>
                                    <td style="color:gray;">-</td>
                                    <td style="color:#16a085; font-weight:bold;">${formatNum(aisData.cashAtBank)}</td>
                                    <td style="color:gray;">-</td>
                                </tr>
                                <tr style="background:#fcfcfc;">
                                    <td style="text-align:left; color:#2c3e50;"><b>Total Equity</b></td>
                                    <td style="color:gray;">-</td>
                                    <td style="color:#8e44ad; font-weight:bold;">${formatNum(aisData.equity)}</td>
                                    <td style="color:gray;">-</td>
                                </tr>
                            </tbody>
                        </table>
                        </div>
                    `;
                }
                
                let expBtn = document.getElementById('export-excel-btn');
                if(expBtn) expBtn.style.display = 'block';
            } 
            else {
                let tableHtml = tableStyle + `
                    <div style="max-height:400px; overflow-y:auto; overflow-x:auto;">
                    <table class="audit-table">
                        <thead style="background:#2c3e50; color:white; position:sticky; top:0; z-index:1;">
                            <tr>
                                <th style="text-align:left;">Branch Name</th>
                                <th style="text-align:left;">Particulars</th>
                                <th>MIS Balance</th>
                                <th>AIS (Current)</th>
                                <th>Difference</th>
                            </tr>
                        </thead>
                `;
                for(let b of branchesToProcess) {
                    let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, '');
                    tableHtml += `
                        <tbody id="tbody-${safeId}">
                            <tr style="background:#fff;">
                                <td style="text-align:left; font-weight:bold; color:#2c3e50;">${b.name}</td>
                                <td colspan="4" style="text-align:center; color:gray; font-size:11px;">⏳ অপেক্ষমান...</td>
                            </tr>
                        </tbody>
                    `;
                }
                tableHtml += `</table></div>`;
                output.innerHTML = tableHtml;

                let successCount = 0;
                for (let i = 0; i < branchesToProcess.length; i++) {
                    let b = branchesToProcess[i];
                    let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, '');

                    updateStatus(`[${i+1}/${branchesToProcess.length}] অডিট চলছে: ${b.name}...`);
                    
                    let tbodyBefore = document.getElementById(`tbody-${safeId}`);
                    if(tbodyBefore) {
                        tbodyBefore.innerHTML = `
                            <tr>
                                <td style="text-align:left; font-weight:bold; color:#2980b9;">${b.name}</td>
                                <td colspan="4" style="text-align:center; color:#d35400; font-size:11px;">🔄 MIS ডাটা রিড করা হচ্ছে...</td>
                            </tr>
                        `;
                    }

                    let mData = await scrapeViaGhost('#/reports/member-migration-balances/member-migration-balance-index', selectedDate, '1', b.id, 'mis', updateStatus);
                    if (!mData) {
                        let tRetry1 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry1) tRetry1.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22;">${b.name}</td><td colspan="4" style="text-align:center; color:#d35400; font-size:11px;">🔄 MIS ফেইল! অটো-রিট্রাই হচ্ছে...</td></tr>`;
                        
                        mData = await scrapeViaGhost('#/reports/member-migration-balances/member-migration-balance-index', selectedDate, '1', b.id, 'mis', updateStatus);
                    }

                    let aData = null;
                    if (mData) {
                        let tRetry2 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9;">${b.name}</td><td colspan="4" style="text-align:center; color:#27ae60; font-size:11px;">🔄 AIS ডাটা রিড করা হচ্ছে...</td></tr>`;
                        
                        aData = await scrapeViaGhost('#/reports/acc-balance-sheets/balance-sheet-report-filter', selectedDate, '1', b.id, 'ais', updateStatus);
                        if (!aData) {
                            let tRetry3 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22;">${b.name}</td><td colspan="4" style="text-align:center; color:#d35400; font-size:11px;">🔄 AIS ফেইল! অটো-রিট্রাই হচ্ছে...</td></tr>`;
                            
                            aData = await scrapeViaGhost('#/reports/acc-balance-sheets/balance-sheet-report-filter', selectedDate, '1', b.id, 'ais', updateStatus);
                        }
                    }

                    let tbodyAfter = document.getElementById(`tbody-${safeId}`);
                    if (!tbodyAfter) continue; 

                    if (mData && aData) {
                        let lDiff = (mData.loan || 0) - (aData.loan || 0);
                        let sDiff = (mData.savings || 0) - (aData.savings || 0);
                        
                        tbodyAfter.innerHTML = `
                            <tr>
                                <td rowspan="5" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; background:#f4f9f4;">${b.name}</td>
                                <td style="text-align:left;"><b>Loan</b></td>
                                <td>${formatNum(mData.loan)}</td>
                                <td>${formatNum(aData.loan)}</td>
                                <td style="color:${lDiff===0?'green':'red'}; font-weight:bold;">${formatNum(lDiff)}</td>
                            </tr>
                            <tr>
                                <td style="text-align:left;"><b>Savings</b></td>
                                <td>${formatNum(mData.savings)}</td>
                                <td>${formatNum(aData.savings)}</td>
                                <td style="color:${sDiff===0?'green':'red'}; font-weight:bold;">${formatNum(sDiff)}</td>
                            </tr>
                            <tr style="background:#fcfcfc;">
                                <td style="text-align:left; color:#2c3e50;"><b>Cash in Hand</b></td>
                                <td style="color:gray;">-</td>
                                <td style="color:#16a085; font-weight:bold;">${formatNum(aData.cashInHand)}</td>
                                <td style="color:gray;">-</td>
                            </tr>
                            <tr style="background:#fcfcfc;">
                                <td style="text-align:left; color:#2c3e50;"><b>Cash at Bank</b></td>
                                <td style="color:gray;">-</td>
                                <td style="color:#16a085; font-weight:bold;">${formatNum(aData.cashAtBank)}</td>
                                <td style="color:gray;">-</td>
                            </tr>
                            <tr style="background:#fcfcfc;">
                                <td style="text-align:left; color:#2c3e50;"><b>Total Equity</b></td>
                                <td style="color:gray;">-</td>
                                <td style="color:#8e44ad; font-weight:bold;">${formatNum(aData.equity)}</td>
                                <td style="color:gray;">-</td>
                            </tr>
                        `;
                        successCount++;
                    } else {
                        tbodyAfter.innerHTML = `
                            <tr>
                                <td style="text-align:left; font-weight:bold; color:#e74c3c;">${b.name}</td>
                                <td colspan="3" style="text-align:center; color:red; font-size:11px;">❌ ডাটা পাওয়া যায়নি</td>
                                <td style="text-align:center; vertical-align:middle;">
                                    <button class="manual-retry-btn" data-id="${b.id}" data-name="${b.name}" style="background:#e74c3c; color:white; border:none; padding:4px 8px; font-size:11px; border-radius:3px; cursor:pointer; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.2);">🔄 Retry</button>
                                </td>
                            </tr>
                        `;
                    }
                }

                let finalStatus = document.getElementById('audit-status');
                if(finalStatus) finalStatus.innerHTML = `<span style="color:green;">✅ ${successCount} টি শাখার অডিট সম্পন্ন!</span>`;
                
                let finalBtn = document.getElementById('start-audit-btn');
                if(finalBtn) { finalBtn.disabled = false; finalBtn.style.background = "#27ae60"; }
                
                let expBtn = document.getElementById('export-excel-btn');
                if(expBtn) expBtn.style.display = 'block';
            }
        };

        if(!document.getElementById('spinner-css')) {
            const style = document.createElement('style');
            style.id = 'spinner-css';
            style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
            document.head.appendChild(style);
        }
    }

    setInterval(() => {
        if (window.location.hash.includes('dashboard')) {
            initDashboard();
        } else if (document.getElementById('ghost-audit-panel')) {
            document.getElementById('ghost-audit-panel').remove();
        }
    }, 1500);

})();
