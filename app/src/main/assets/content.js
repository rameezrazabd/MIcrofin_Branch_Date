// ========================================================================
// 🧹 CLEAN UP LEGACY SNAPSHOT MEMORY (No persistent storage for Extension)
// ========================================================================
try {
    localStorage.removeItem('mf_cached_zones');
    localStorage.removeItem('mf_cached_areas');
    localStorage.removeItem('mf_cached_branches');
    localStorage.removeItem('mf_cached_dates_v2');
    localStorage.removeItem('mf_user_type');
} catch(e) {}

// ========================================================================
// 🔔 0. AUTO UPDATE NOTIFICATION SYSTEM
// ========================================================================
(function checkAppUpdate() {
    const CURRENT_VERSION = "1.3"; // বর্তমান অ্যাপ ভার্সন
    
    // ⚠️ নিচে YOUR_USERNAME এর জায়গায় আপনার গিটহাবের আসল ইউজারনেম বসিয়ে দিন 
    const UPDATE_JSON_URL = "https://raw.githubusercontent.com/rameezrazabd/Microfin_Branch_Date/main/update.json"; 

    setTimeout(() => {
        fetch(UPDATE_JSON_URL + "?t=" + new Date().getTime())
            .then(res => res.json())
            .then(data => {
                if (data && data.version && parseFloat(data.version) > parseFloat(CURRENT_VERSION)) {
                    showUpdateModal(data);
                }
            })
            .catch(err => console.log("Update check:", err));
    }, 4000);

    function showUpdateModal(data) {
        if (document.getElementById('mf-update-modal')) return;
        
        const modal = document.createElement('div');
        modal.id = 'mf-update-modal';
        modal.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.7); z-index:9999999; display:flex; justify-content:center; align-items:center; font-family:Arial;';
        
        modal.innerHTML = `
            <div style="background:white; width:85%; max-width:340px; border-radius:10px; padding:20px; text-align:center; box-shadow:0 10px 30px rgba(0,0,0,0.5); animation: popIn 0.3s ease;">
                <div style="font-size:42px; margin-bottom:10px;">🚀</div>
                <h3 style="margin:0 0 10px 0; color:#2c3e50; font-size:18px; font-weight:bold;">${data.title || 'নতুন আপডেট এসেছে!'}</h3>
                <p style="color:#444; font-size:13px; line-height:1.5; margin-bottom:18px; text-align:left; background:#f8f9fa; padding:12px; border-radius:6px; border-left:4px solid #2980b9;">${data.message || 'অ্যাপটির একটি নতুন সংস্করণ উপলব্ধ হয়েছে। আরও উন্নত সুবিধা পেতে এখনই আপডেট করুন।'}</p>
                
                <button id="btn-do-update" style="width:100%; background:#27ae60; color:white; border:none; padding:12px; border-radius:5px; font-weight:bold; font-size:14px; cursor:pointer; box-shadow:0 4px 10px rgba(39,174,96,0.3); margin-bottom:8px;">📥 এখনই ডাউনলোড করুন</button>
                
                ${data.force_update ? '' : '<button id="btn-skip-update" style="width:100%; background:none; color:#7f8c8d; border:none; padding:8px; font-size:12px; cursor:pointer;">পরে মনে করাও</button>'}
            </div>
        `;
        
        document.body.appendChild(modal);
        
        document.getElementById('btn-do-update').onclick = () => {
            if (window.AndroidDownloader && window.AndroidDownloader.openUrl) {
                window.AndroidDownloader.openUrl(data.download_url);
            } else {
                window.open(data.download_url, '_blank');
            }
        };
        
        let skipBtn = document.getElementById('btn-skip-update');
        if (skipBtn) {
            skipBtn.onclick = () => modal.remove();
        }
    }
})();

// ========================================================================
// 🌐 0.5 CENTRAL HIERARCHY MASTER SCANNER (UNIFIED SYSTEM SYNC FOR ALL UIs)
// ========================================================================
(function() {
    'use strict';
    
    window._isCentralSyncRunning = false;

    function triggerVueChange(el, value, win) {
        if (!el) return;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        if (win && win.jQuery) win.jQuery(el).trigger('change');
    }

    function findSelect(doc, name) {
        if (!doc) return null;
        return doc.getElementById(name) || doc.querySelector(`select[name="${name}"]`);
    }

    async function waitForSelect(doc, name, minLen = 1) {
        for (let i = 0; i < 40; i++) {
            let el = findSelect(doc, name);
            if (el && el.options && el.options.length > minLen) return el;
            await new Promise(r => setTimeout(r, 250));
        }
        return findSelect(doc, name);
    }

    window.runGlobalHierarchySync = function(force = false, callback = null) {
        if (!force && sessionStorage.getItem('mf_global_hierarchy_synced') === 'TRUE') {
            if (callback) callback(true);
            return;
        }
        if (window._isCentralSyncRunning) {
            if (callback) {
                window.addEventListener('mf_central_sync_completed', () => callback(true), { once: true });
            }
            return;
        }
        window._isCentralSyncRunning = true;

        let toast = document.getElementById('central-sync-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'central-sync-toast';
            toast.style.cssText = 'position:fixed; top:20px; right:20px; background:#f39c12; color:white; padding:12px 18px; z-index:9999999; border-radius:6px; font-weight:bold; font-size:13px; font-family:Arial; box-shadow:0 6px 16px rgba(0,0,0,0.35); transition:all 0.3s ease; display:flex; align-items:center; gap:8px;';
            document.body.appendChild(toast);
        }
        toast.style.background = '#f39c12';
        toast.innerHTML = '<span>⚙️ Central System Sync: Scanning Zones, Areas & Branches...</span>';

        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed; top:0px; left:-9999px; width:1200px; height:800px; border:none; z-index:-1;';
        iframe.src = window.location.origin + window.location.pathname + '#/reports/po-mis-reports/po-mis-1-index';
        document.body.appendChild(iframe);

        let timeout = setTimeout(() => {
            if (document.body.contains(iframe)) iframe.remove();
            window._isCentralSyncRunning = false;
            toast.style.background = '#e74c3c';
            toast.innerHTML = '<span>⚠️ Sync Taking Long... Will Retry automatically!</span>';
            setTimeout(() => toast.remove(), 3000);
            if (callback) callback(false);
        }, 45000);

        iframe.onload = () => {
            setTimeout(async () => {
                try {
                    let doc = iframe.contentDocument || iframe.contentWindow.document;
                    let win = iframe.contentWindow;

                    let reportLvl = null, branchSel = null;
                    let formReadyCount = 0;
                    for (let i = 0; i < 40; i++) {
                        reportLvl = findSelect(doc, 'cbo_report_level');
                        branchSel = findSelect(doc, 'cbo_branch');
                        if (reportLvl || branchSel) break;

                        let anyElement = doc.querySelector('select, button, input, label, table, .card, .panel, h1, h2, h3, h4');
                        if (anyElement) {
                            formReadyCount++;
                            if (formReadyCount >= 5) break;
                        }
                        await new Promise(r => setTimeout(r, 300));
                    }

                    let uType = 'BRANCH';
                    let zones = [], areas = [], branches = [];
                    let zMap = {}, aMap = {};
                    let currentZone = "Unknown Zone";

                    if (reportLvl && reportLvl.options && reportLvl.options.length > 0) {
                        uType = 'HO';
                        let hasZone = Array.from(reportLvl.options).some(o => o.value === '3');
                        if (hasZone) {
                            triggerVueChange(reportLvl, '3', win);
                            await new Promise(r => setTimeout(r, 800));
                            let zoneSel = await waitForSelect(doc, 'cbo_zone');
                            if (zoneSel && zoneSel.options) {
                                Array.from(zoneSel.options).forEach(opt => {
                                    if (opt.value && opt.value !== '-1' && !opt.text.includes('--')) {
                                        if (!opt.disabled && !opt.value.includes('@@@')) {
                                            currentZone = opt.text.trim();
                                            zones.push({ id: opt.value, name: currentZone });
                                        } else if (opt.disabled && opt.value.includes('@@@')) {
                                            let areaName = opt.text.replace(/\u00A0/g, '').replace(/@@@/g, '').trim();
                                            if (areaName) zMap[areaName] = currentZone;
                                        }
                                    }
                                });
                            }
                        }

                        let hasArea = Array.from(reportLvl.options).some(o => o.value === '2');
                        if (hasArea) {
                            triggerVueChange(reportLvl, '2', win);
                            await new Promise(r => setTimeout(r, 800));
                            let areaSel = await waitForSelect(doc, 'cbo_area');
                            if (areaSel && areaSel.options) {
                                let currentArea = "Unknown Area";
                                Array.from(areaSel.options).forEach(opt => {
                                    if (opt.value && opt.value !== '-1' && !opt.text.includes('--')) {
                                        if (!opt.disabled && !opt.value.includes('@@@')) {
                                            currentArea = opt.text.trim();
                                            let pZone = zMap[currentArea] || currentZone || "Unknown Zone";
                                            areas.push({ id: opt.value, name: currentArea, zone: pZone });
                                        } else if (opt.disabled && opt.value.includes('@@@')) {
                                            let bId = opt.value.split('##')[1] || opt.value.replace(/[^0-9]/g, '');
                                            let bNameClean = opt.text.replace(/\u00A0/g, '').replace(/@@@/g, '').trim();
                                            if (bId) {
                                                aMap[bId] = currentArea;
                                                zMap[bId] = zMap[currentArea] || currentZone || "Unknown Zone";
                                            }
                                            if (bNameClean) {
                                                aMap[bNameClean] = currentArea;
                                                zMap[bNameClean] = zMap[currentArea] || currentZone || "Unknown Zone";
                                            }
                                        }
                                    }
                                });
                            }
                        }

                        let hasBranch = Array.from(reportLvl.options).some(o => o.value === '1');
                        if (hasBranch) {
                            triggerVueChange(reportLvl, '1', win);
                            await new Promise(r => setTimeout(r, 800));
                            let bSel = await waitForSelect(doc, 'cbo_branch');
                            if (bSel && bSel.options) {
                                Array.from(bSel.options).forEach(opt => {
                                    if (opt.value && opt.value !== '-1' && !opt.text.includes('--')) {
                                        let bName = opt.text.trim();
                                        if (!opt.disabled && !opt.value.includes('@@@') && !/\b(area|zone)\b/i.test(bName)) {
                                            let bId = opt.value;
                                            let bArea = aMap[bId] || aMap[bName] || "Unknown Area";
                                            let bZone = zMap[bArea] || zMap[bId] || currentZone || "Unknown Zone";
                                            branches.push({ id: bId, name: bName, area: bArea, zone: bZone });
                                            aMap[bId] = bArea;
                                            zMap[bId] = bZone;
                                        }
                                    }
                                });
                            }
                        }
                    } else if (branchSel && branchSel.options && branchSel.options.length > 2) {
                        uType = 'AREA';
                        let bSel = await waitForSelect(doc, 'cbo_branch', 0);
                        if (bSel && bSel.options) {
                            Array.from(bSel.options).forEach(opt => {
                                if (opt.value && opt.value !== '-1' && opt.value !== '' && !opt.text.includes('--')) {
                                    let bName = opt.text.trim();
                                    if (!opt.disabled && !opt.value.includes('@@@') && !/\b(area|zone)\b/i.test(bName)) {
                                        branches.push({ id: opt.value, name: bName, area: 'Assigned Area', zone: 'Assigned Zone' });
                                        aMap[opt.value] = 'Assigned Area';
                                        zMap[opt.value] = 'Assigned Zone';
                                    }
                                }
                            });
                        }
                    } else {
                        uType = 'BRANCH';
                        let myName = "My Branch";
                        let myId = "SELF";
                        if (branchSel && branchSel.options && branchSel.options.length > 0) {
                            Array.from(branchSel.options).forEach(opt => {
                                if (opt.value && opt.value !== '-1' && opt.value !== '' && !opt.text.includes('--')) {
                                    myId = opt.value;
                                    myName = opt.text.trim();
                                }
                            });
                        }
                        if (myId === "SELF" || myName === "My Branch") {
                            let bInfo = doc.querySelector('.branch_info');
                            if (bInfo && bInfo.innerText.includes('Branch:')) {
                                let m = bInfo.innerText.match(/Branch:\s*(.*?)\s*(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i);
                                if (m && m[1]) myName = m[1].trim();
                            }
                        }
                        branches = [{ id: myId, name: myName, area: 'Branch', zone: 'Branch' }];
                    }

                    if (branches.length > 0) {
                        // Save simultaneously for ALL UIs & extensions
                        sessionStorage.setItem('mf_user_type', uType);
                        sessionStorage.setItem('mf_cached_zones', JSON.stringify(zones));
                        sessionStorage.setItem('mf_cached_areas', JSON.stringify(areas));
                        sessionStorage.setItem('mf_cached_branches', JSON.stringify(branches));
                        sessionStorage.setItem('mf_auto_synced', 'true');
                        sessionStorage.setItem('mf_global_hierarchy_synced', 'TRUE');

                        localStorage.setItem('microfin_role', uType === 'AREA' ? 'ZONE' : uType);
                        localStorage.setItem('microfin_branch_list', JSON.stringify(branches));
                        localStorage.setItem('microfin_aMap', JSON.stringify(aMap));
                        localStorage.setItem('microfin_zMap', JSON.stringify(zMap));
                        localStorage.setItem('microfin_sync_status', 'DONE');

                        toast.style.background = '#27ae60';
                        toast.innerHTML = `<span>✅ Central Sync Complete! (${branches.length} Branches Ready)</span>`;
                        setTimeout(() => toast.remove(), 2500);
                        window.dispatchEvent(new CustomEvent('mf_central_sync_completed'));
                        if (callback) callback(true);
                    } else {
                        throw new Error("No branches found during scan");
                    }

                    clearTimeout(timeout);
                    if (document.body.contains(iframe)) iframe.remove();
                    window._isCentralSyncRunning = false;
                } catch (err) {
                    console.error("Central Sync Error:", err);
                    clearTimeout(timeout);
                    if (document.body.contains(iframe)) iframe.remove();
                    window._isCentralSyncRunning = false;
                    toast.style.background = '#e74c3c';
                    toast.innerHTML = '<span>⚠️ Temporary Sync Glitch. Will retry soon!</span>';
                    setTimeout(() => toast.remove(), 3000);
                    if (callback) callback(false);
                }
            }, 800);
        };
    };

    // Auto-detect login & dashboard entry to fire scan immediately
    setInterval(() => {
        if (window !== window.top) return;
        if (window.location.hash.includes('login') || window.location.hash.includes('logout')) {
            sessionStorage.removeItem('mf_global_hierarchy_synced');
            sessionStorage.removeItem('mf_auto_synced');
            localStorage.removeItem('microfin_sync_status');
        } else if (window.location.hash.includes('dashboard')) {
            if (sessionStorage.getItem('mf_global_hierarchy_synced') !== 'TRUE' && !window._isCentralSyncRunning) {
                window.runGlobalHierarchySync(false);
            }
        }
    }, 1000);
})();

// ========================================================================
// EXTENSION 1: 📅 Branch Date Extractor (Compact Mobile Edition)
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
        for(let i=0; i<80; i++) {
            let el = doc.querySelector(selector);
            if (el && el.options.length > minLen) return el;
            await new Promise(r => setTimeout(r, 100));
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

            let uTypePrep = sessionStorage.getItem('mf_user_type') || localStorage.getItem('mf_user_type') || 'HO';
            let isBranchRolePrep = (uTypePrep === 'BRANCH' || targetId === 'SELF' || (branchesToProcess && branchesToProcess.length === 1 && branchesToProcess[0].id === 'SELF'));
            let targetHash = mode === 'MIS' ? '#/mis/dashboard' : (isBranchRolePrep ? '#/reports/acc-balance-sheets/balance-sheet-report-filter' : '#/ais/dashboard');
            iframe.src = window.location.origin + window.location.pathname + targetHash;
            document.body.appendChild(iframe);

            let timeout = setTimeout(() => { iframe.remove(); resolve({}); }, 60000);
            let isProcessed = false;

            iframe.onload = () => {
                if(isProcessed) return;

                setTimeout(async () => {
                    try {
                        let doc = iframe.contentDocument || iframe.contentWindow.document;
                        let win = iframe.contentWindow;
                        let uType = sessionStorage.getItem('mf_user_type') || localStorage.getItem('mf_user_type') || 'HO';
                        let isBranchRole = (uType === 'BRANCH' || targetId === 'SELF' || (branchesToProcess && branchesToProcess.length === 1 && branchesToProcess[0].id === 'SELF'));

                        if (!isBranchRole) {
                            for(let i=0; i<5; i++) {
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
                                        await new Promise(r => setTimeout(r, 1200));
                                    }
                                    break;
                                }
                                await new Promise(r => setTimeout(r, 350));
                            }
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
                                }, 400);
                            });
                        }

                        if (!isBranchRole) {
                            if (mode === 'MIS') {
                                await clickWhenReady('branch performance', false, 15000);
                                await new Promise(r => setTimeout(r, 1000));
                                await clickWhenReady('more...', true, 15000);
                            }
                            else if (mode === 'AIS') {
                                await clickWhenReady('branch status', false, 15000);
                            }
                        }

                        let pollCount = 0;
                        let poll = setInterval(() => {
                            pollCount++;
                            if (pollCount > 120) {
                                clearInterval(poll); clearTimeout(timeout);
                                iframe.remove(); resolve({}); return;
                            }

                            if (isBranchRole) {
                                let match = null;
                                let dateRegex = /\d{1,2}\s+[a-zA-Z]{3},\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{2}-\d{2}-\d{4}|\d{2}\/\d{2}\/\d{4}/g;
                                let inputs = doc.querySelectorAll('input[name*="date"], input[name*="txt"], input[type="text"], input[type="date"], input.datepicker, input');
                                for(let inp of inputs) {
                                    if (inp && inp.value) {
                                        let m = inp.value.match(dateRegex);
                                        if (m && m.length > 0) { match = m; break; }
                                    }
                                }
                                if (!match) {
                                    let checkEls = doc.querySelectorAll('table tr, .card, .widget, .dashboard-box, table');
                                    for(let el of checkEls) {
                                        let m = el.textContent.match(dateRegex);
                                        if (m && m.length > 0) { match = m; break; }
                                    }
                                }
                                if (!match && doc.body) {
                                    match = doc.body.textContent.match(dateRegex);
                                }
                                if (match && match.length > 0) {
                                    clearInterval(poll); clearTimeout(timeout);
                                    isProcessed = true;
                                    let finalDate = match[match.length - 1].replace(/\s+/g, ' ');
                                    let dataMap = { 'self': finalDate, 'mybranch': finalDate, 'default': finalDate };
                                    iframe.remove(); resolve(dataMap); return;
                                }
                                return;
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
                        }, 400);

                    } catch(e) {
                        clearTimeout(timeout); iframe.remove(); resolve({});
                    }
                }, 2500);
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
                        let formReadyCount = 0;
                        for(let i=0; i<30; i++) {
                            reportLvl = doc.querySelector('select[name="cbo_report_level"]');
                            branchSel = doc.querySelector('select[name="cbo_branch"]');
                            if(reportLvl || branchSel) break;

                            let anyElement = doc.querySelector('select, button, input, label, table, .card, .panel, h1, h2, h3, h4');
                            if (anyElement) {
                                formReadyCount++;
                                if (formReadyCount >= 2) break;
                            }
                            await new Promise(r => setTimeout(r, 300));
                        }

                        let zones = [], areas = [], branches = [];
                        let zMap = {}, aMap = {};

                        if (reportLvl) {
                            let hasZone = Array.from(reportLvl.options).some(o => o.value === '3');
                            let hasArea = Array.from(reportLvl.options).some(o => o.value === '2');
                            let hasBranch = Array.from(reportLvl.options).some(o => o.value === '1');

                            if (hasZone) {
                                sessionStorage.setItem('mf_user_type', 'HO');
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
                                if (!hasZone) sessionStorage.setItem('mf_user_type', 'AREA');
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
                                if (!hasZone && !hasArea) sessionStorage.setItem('mf_user_type', 'BRANCH');
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
                            sessionStorage.setItem('mf_user_type', 'AREA');
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
                            sessionStorage.setItem('mf_user_type', 'BRANCH');
                            if(statusCallback) statusCallback("সিস্টেম প্রস্তুত!");
                            branches.push({id: 'SELF', name: 'My Branch', area: 'N/A', zone: 'N/A'});
                        }

                        sessionStorage.setItem('mf_cached_zones', JSON.stringify(zones));
                        sessionStorage.setItem('mf_cached_areas', JSON.stringify(areas));
                        sessionStorage.setItem('mf_cached_branches', JSON.stringify(branches));
                        
                        clearTimeout(timeout); iframe.remove(); resolve(true);
                    } catch(e) { clearTimeout(timeout); iframe.remove(); resolve(false); }
                }, 300);
            };
        });
    }

    function performRoleWiseSync() {
        if (document.getElementById('sync-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'sync-overlay';
        overlay.style.cssText = 'position:fixed; top:15px; right:15px; background:#f39c12; color:white; padding:8px 12px; z-index:99999; border-radius:4px; font-size:11px; font-weight:bold; box-shadow: 0 4px 8px rgba(0,0,0,0.3);';
        overlay.innerHTML = '⚙️ Auto Syncing...';
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
                    ov.innerHTML = '✅ Synced!';
                } else {
                    ov.style.background = '#e74c3c';
                    ov.innerHTML = '❌ Sync Failed!';
                }
                setTimeout(() => ov.remove(), 2000);
            }
            if(document.getElementById('bde-ui-level')) updateUIForRole();
        });
    }

    let isBdeBtnClosed = false;
    function initFloatingButton() {
        if (isBdeBtnClosed || document.getElementById('bde-ghost-date-toggle')) return;
        
        let container = document.createElement('div');
        container.id = 'bde-ghost-date-toggle';
        container.style.cssText = 'position:fixed; bottom:110px; right:16px; display:flex; align-items:center; background:#2980b9; color:white; border-radius:50px; padding:8px 14px; font-weight:bold; font-size:13px; box-shadow:0 4px 14px rgba(0,0,0,0.4); z-index:999998; font-family:Arial; transition:all 0.3s ease; cursor:pointer;';
        
        let textSpan = document.createElement('span');
        textSpan.innerText = '📅 Branch Dates';
        textSpan.style.cssText = 'margin-right:8px; pointer-events:none;';

        let closeBtn = document.createElement('button');
        closeBtn.innerText = '✕';
        closeBtn.title = 'বন্ধ করুন';
        closeBtn.style.cssText = 'background: rgba(255,255,255,0.25); color:white; border:none; width:20px; height:20px; border-radius:50%; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; outline:none; transition:0.2s;';
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,0,0,0.8)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.25)';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            isBdeBtnClosed = true;
            container.remove();
            let p = document.getElementById('bde-ghost-date-panel');
            if(p) p.remove();
        };

        container.onclick = () => openMainPanel();
        container.appendChild(textSpan);
        container.appendChild(closeBtn);
        document.body.appendChild(container);
    }

    function openMainPanel() {
        if (document.getElementById('bde-ghost-date-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'bde-ghost-date-panel';
        panel.style.cssText = 'position: fixed; top: 5px; bottom: 35px; left: 50%; transform: translateX(-50%); background: #fff; border: 2px solid #2c3e50; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.45); width: 97vw; max-width: 680px; display:flex; flex-direction:column; font-family: Arial; z-index: 999999; overflow: hidden;';

        document.body.appendChild(panel);

        panel.innerHTML = `
            <div id="bde-drag-header" style="background:#2c3e50; color:white; padding:7px 12px; display:flex; justify-content:space-between; align-items:center; cursor:move; flex-shrink:0;">
                <strong style="font-size:13px;">📅 Branch Date Extractor</strong>
                <button id="bde-close-date-panel" title="বন্ধ করুন" style="background: linear-gradient(135deg, #ff416c, #ff4b2b); color: white; border: none; width: 26px; height: 26px; border-radius: 50%; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(255, 65, 108, 0.45); transition: all 0.2s ease; outline: none; padding: 0;" onmouseover="this.style.transform='scale(1.15)'; this.style.boxShadow='0 3px 10px rgba(255, 65, 108, 0.7)';" onmouseout="this.style.transform='scale(1)'; this.style.boxShadow='0 2px 6px rgba(255, 65, 108, 0.45)';" onmousedown="this.style.transform='scale(0.95)';">✕</button>
            </div>

            <div style="padding:6px; display:flex; flex-direction:column; flex:1; overflow:hidden;">
                <div style="display:flex; gap:4px; margin-bottom:4px; align-items:flex-end; flex-shrink:0;">
                    <div style="flex:1;">
                        <label style="font-size:10px; font-weight:bold; color:#555;">📍 লেভেল:</label>
                        <select id="bde-ui-level" style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-size:11px; height:24px;"></select>
                    </div>
                    <div style="flex:1.6;">
                        <label style="font-size:10px; font-weight:bold; color:#555;">🏢 নির্বাচন করুন:</label>
                        <select id="bde-ui-target" style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-size:11px; height:24px;"></select>
                    </div>
                    <div>
                        <button id="bde-sync-btn" style="height:24px; width:28px; background:#bdc3c7; color:#2c3e50; border:none; border-radius:3px; cursor:pointer; font-weight:bold; font-size:12px;" title="সিঙ্ক">🔄</button>
                    </div>
                </div>

                <button id="bde-start-fetch-btn" style="width:100%; background:#27ae60; color:white; border:none; padding:6px; font-weight:bold; font-size:13px; border-radius:4px; cursor:pointer; margin-bottom:5px; flex-shrink:0;">🚀 Fetch Dates (Auto Engine)</button>
                
                <!-- 🌟 স্লিম স্মার্ট ২-ট্যাব (বক্স ও ট্যাব একত্রিত করা হলো জায়গা বাঁচাতে) -->
                <div id="bde-tabs-bar" style="display:flex; gap:6px; margin-bottom:5px; flex-shrink:0;">
                    <button id="bde-tab-all" style="flex:1; background:#2980b9; color:white; border:none; padding:6px; border-radius:4px; font-size:11.5px; font-weight:bold; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.2);">🏢 সকল শাখা (<span id="bde-lbl-all">০</span>)</button>
                    <button id="bde-tab-overdue" style="flex:1; background:#fdedec; color:#c0392b; border:1px solid #e74c3c; padding:6px; border-radius:4px; font-size:11.5px; font-weight:bold; cursor:pointer; box-shadow:0 1px 3px rgba(231,76,60,0.15);">⚠️ পিছিয়ে আছে (<span id="bde-lbl-overdue">০</span>)</button>
                </div>

                <div id="bde-status-msg" style="font-size:11px; font-weight:bold; color:#d35400; text-align:center; min-height:16px; flex-shrink:0;"></div>
                
                <div id="bde-table-output" style="margin-top:4px; flex:1; overflow-y:auto; border:1px solid #eaeaea; border-radius:4px;"></div>
                
                <button id="bde-export-excel-btn" style="display:none; width:100%; background:#8e44ad; color:white; border:none; padding:6px; margin-top:4px; font-weight:bold; font-size:13px; border-radius:4px; cursor:pointer; flex-shrink:0;">📥 Download Excel</button>
            </div>
        `;

        document.getElementById('bde-close-date-panel').onclick = () => panel.remove();
        makeDraggable(panel, document.getElementById('bde-drag-header'));
        document.getElementById('bde-ui-level').onchange = populateTargets;

        let tabAll = document.getElementById('bde-tab-all');
        let tabOverdue = document.getElementById('bde-tab-overdue');

        function filterTableRows(showOnlyOverdue) {
            if (showOnlyOverdue) {
                tabAll.style.background = '#ecf0f1'; tabAll.style.color = '#7f8c8d'; tabAll.style.border = '1px solid #bdc3c7';
                tabOverdue.style.background = '#e74c3c'; tabOverdue.style.color = 'white'; tabOverdue.style.border = 'none';
            } else {
                tabAll.style.background = '#2980b9'; tabAll.style.color = 'white'; tabAll.style.border = 'none';
                tabOverdue.style.background = '#fdedec'; tabOverdue.style.color = '#c0392b'; tabOverdue.style.border = '1px solid #e74c3c';
            }
            document.querySelectorAll('#bde-table-output tbody[id^="bde-tr-"]').forEach(tbody => {
                let status = tbody.getAttribute('data-status');
                if (showOnlyOverdue) {
                    tbody.style.display = (status === 'overdue') ? '' : 'none';
                } else {
                    tbody.style.display = '';
                }
            });
        }

        if (tabAll && tabOverdue) {
            tabAll.onclick = () => filterTableRows(false);
            tabOverdue.onclick = () => filterTableRows(true);
        }

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

            let statusMsg = document.getElementById('bde-status-msg');
            if(statusMsg) statusMsg.innerHTML = "<span style='color:#2980b9;'>⏳ Excel ফাইল তৈরি হচ্ছে...</span>";

            try {
                let allRows = [];
                let overdueRows = [];
                
                table.querySelectorAll('tbody[id^="bde-tr-"]').forEach(tbody => {
                    let tr = tbody.querySelector('tr');
                    if (tr && tr.cells.length >= 5) {
                        let isOverdue = tbody.getAttribute('data-status') === 'overdue';
                        let branch = tr.cells[0].innerText.replace(/[\r\n]+/g, ' ').replace(/\[.*?\]/g, '').trim();
                        let statusText = isOverdue ? "🔴 পিছিয়ে আছে" : "✅ সঠিক";
                        
                        let rowObj = {
                            branch: branch,
                            status: statusText,
                            misDate: tr.cells[1].innerText.trim(),
                            misLag: tr.cells[2].innerText.trim(),
                            aisDate: tr.cells[3].innerText.trim(),
                            aisLag: tr.cells[4].innerText.trim()
                        };

                        allRows.push(rowObj);
                        if (isOverdue) overdueRows.push(rowObj);
                    }
                });

                let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D8E0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D8E0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D8E0"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D8E0"/>
   </Borders>
   <Font ss:FontName="Calibri" ss:Size="10" ss:Color="#2C3E50"/>
  </Style>
  <Style ss:ID="H_Branch"><Interior ss:Color="#2C3E50" ss:Pattern="Solid"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>
  <Style ss:ID="H_Status"><Interior ss:Color="#2C3E50" ss:Pattern="Solid"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="H_MIS"><Interior ss:Color="#2980B9" ss:Pattern="Solid"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="H_AIS"><Interior ss:Color="#27AE60" ss:Pattern="Solid"/><Font ss:FontName="Calibri" ss:Size="11" ss:Bold="1" ss:Color="#FFFFFF"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  
  <Style ss:ID="R_Normal_L" ss:Parent="Default"><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>
  <Style ss:ID="R_Normal_C" ss:Parent="Default"><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="R_Normal_S" ss:Parent="Default"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#27AE60"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>

  <Style ss:ID="R_Delay_L" ss:Parent="Default"><Interior ss:Color="#FFF5F5" ss:Pattern="Solid"/><Alignment ss:Horizontal="Left" ss:Vertical="Center"/></Style>
  <Style ss:ID="R_Delay_C" ss:Parent="Default"><Interior ss:Color="#FFF5F5" ss:Pattern="Solid"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="R_Delay_S" ss:Parent="Default"><Interior ss:Color="#FFF5F5" ss:Pattern="Solid"/><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#C0392B"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>

  <Style ss:ID="Lag_Red" ss:Parent="Default"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#C0392B"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="Lag_Org" ss:Parent="Default"><Font ss:FontName="Calibri" ss:Size="10" ss:Bold="1" ss:Color="#D35400"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
  <Style ss:ID="Lag_Grn" ss:Parent="Default"><Font ss:FontName="Calibri" ss:Size="10" ss:Color="#27AE60"/><Alignment ss:Horizontal="Center" ss:Vertical="Center"/></Style>
 </Styles>`;

                function buildWorksheet(sheetName, dataRows) {
                    let sXml = ` <Worksheet ss:Name="${sheetName}">\n  <Table>\n   <Column ss:Width="240"/>\n   <Column ss:Width="110"/>\n   <Column ss:Width="95"/>\n   <Column ss:Width="75"/>\n   <Column ss:Width="95"/>\n   <Column ss:Width="75"/>\n   <Row ss:Height="22">\n    <Cell ss:StyleID="H_Branch"><Data ss:Type="String">শাখার নাম</Data></Cell>\n    <Cell ss:StyleID="H_Status"><Data ss:Type="String">স্ট্যাটাস</Data></Cell>\n    <Cell ss:StyleID="H_MIS"><Data ss:Type="String">MIS ডেট</Data></Cell>\n    <Cell ss:StyleID="H_MIS"><Data ss:Type="String">বিলম্ব</Data></Cell>\n    <Cell ss:StyleID="H_AIS"><Data ss:Type="String">AIS ডেট</Data></Cell>\n    <Cell ss:StyleID="H_AIS"><Data ss:Type="String">বিলম্ব</Data></Cell>\n   </Row>`;

                    dataRows.forEach(r => {
                        let isDelay = r.status.includes("পিছিয়ে") || r.status.includes("🔴");
                        let cL = isDelay ? "R_Delay_L" : "R_Normal_L";
                        let cC = isDelay ? "R_Delay_C" : "R_Normal_C";
                        let cS = isDelay ? "R_Delay_S" : "R_Normal_S";
                        
                        function getLagStyle(valStr, fallbackStyle) {
                            let v = parseInt(valStr || "0");
                            if (isNaN(v)) return fallbackStyle;
                            if (v > 2) return "Lag_Red";
                            if (v > 0) return "Lag_Org";
                            return "Lag_Grn";
                        }

                        let mStyle = getLagStyle(r.misLag, cC);
                        let aStyle = getLagStyle(r.aisLag, cC);

                        sXml += `\n   <Row ss:Height="18">\n    <Cell ss:StyleID="${cL}"><Data ss:Type="String">${r.branch}</Data></Cell>\n    <Cell ss:StyleID="${cS}"><Data ss:Type="String">${r.status}</Data></Cell>\n    <Cell ss:StyleID="${cC}"><Data ss:Type="String">${r.misDate}</Data></Cell>\n    <Cell ss:StyleID="${mStyle}"><Data ss:Type="String">${r.misLag}</Data></Cell>\n    <Cell ss:StyleID="${cC}"><Data ss:Type="String">${r.aisDate}</Data></Cell>\n    <Cell ss:StyleID="${aStyle}"><Data ss:Type="String">${r.aisLag}</Data></Cell>\n   </Row>`;
                    });

                    sXml += `\n  </Table>\n </Worksheet>`;
                    return sXml;
                }

                xml += buildWorksheet("🏢 সকল শাখা", allRows);
                xml += buildWorksheet("⚠️ পিছিয়ে আছে", overdueRows);
                xml += `\n</Workbook>`;

                let fileName = `Branch_Dates_${new Date().toISOString().split('T')[0]}.xls`;

                if (window.AndroidDownloader && window.AndroidDownloader.saveExcel) {
                    window.AndroidDownloader.saveExcel(xml, fileName);
                } else {
                    let blob = new Blob([xml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
                    let url = URL.createObjectURL(blob);
                    let link = document.createElement("a");
                    link.href = url;
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }

                if(statusMsg) statusMsg.innerHTML = "<span style='color:green;'>✅ Excel ফাইলটি সফলভাবে ডাউনলোড হয়েছে!</span>";
            } catch(err) {
                console.error(err);
                if(statusMsg) statusMsg.innerHTML = `<span style='color:red;'>❌ Excel ডাউনলোডে সমস্যা: ${err.message}</span>`;
            }
        };

        if (sessionStorage.getItem('mf_cached_branches')) {
            updateUIForRole();
        } else {
            document.getElementById('bde-status-msg').innerHTML = "<span style='color:#2980b9;'>⏳ স্ক্যান চলছে, একটু অপেক্ষা করুন...</span>";
        }
    }

    function updateUIForRole() {
        let zones = JSON.parse(sessionStorage.getItem('mf_cached_zones') || '[]');
        let areas = JSON.parse(sessionStorage.getItem('mf_cached_areas') || '[]');
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
        if (level === '3') data = JSON.parse(sessionStorage.getItem('mf_cached_zones') || '[]');
        else if (level === '2') data = JSON.parse(sessionStorage.getItem('mf_cached_areas') || '[]');
        else if (level === '1') data = JSON.parse(sessionStorage.getItem('mf_cached_branches') || '[]');

        data.forEach(item => {
            targetSel.innerHTML += `<option value="${item.id}" data-name="${item.name}">${item.name}</option>`;
        });
    }

    async function startFetchingDates() {
        let level = document.getElementById('bde-ui-level').value;
        let targetSel = document.getElementById('bde-ui-target');
        let targetId = targetSel.value;
        let targetName = targetSel.options[targetSel.selectedIndex].getAttribute('data-name');

        let allBranches = JSON.parse(sessionStorage.getItem('mf_cached_branches') || '[]');
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
            <table style="width:100%; border-collapse:collapse; font-size:10px; text-align:center; table-layout:fixed;">
                <thead style="position: sticky; top: 0; z-index:5;">
                    <tr>
                        <th style="padding:5px 2px; border:1px solid #bdc3c7; background:#2c3e50; color:white; width:46%; text-align:left; padding-left:5px;">শাখার নাম</th>
                        <th style="padding:5px 1px; border:1px solid #bdc3c7; background:#2980b9; color:white; width:18%; white-space:nowrap;">MIS ডেট</th>
                        <th style="padding:5px 1px; border:1px solid #bdc3c7; background:#2980b9; color:white; width:9%; white-space:nowrap;">বিলম্ব</th>
                        <th style="padding:5px 1px; border:1px solid #bdc3c7; background:#27ae60; color:white; width:18%; white-space:nowrap;">AIS ডেট</th>
                        <th style="padding:5px 1px; border:1px solid #bdc3c7; background:#27ae60; color:white; width:9%; white-space:nowrap;">বিলম্ব</th>
                    </tr>
                </thead>
        `;

        for(let b of branchesToProcess) {
            let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, '');
            tableHtml += `
                <tbody id="bde-tr-${safeId}" data-status="current">
                    <tr>
                        <td style="text-align:left; padding:4px 3px; border:1px solid #bdc3c7; font-weight:bold; white-space:normal; line-height:1.25; font-size:10px;">${b.name}</td>
                        <td colspan="4" style="padding:3px 2px; border:1px solid #bdc3c7; color:gray; font-size:10px; white-space:nowrap;">⏳ ফেচিং...</td>
                    </tr>
                </tbody>
            `;
        }
        tableHtml += `</table>`;
        output.innerHTML = tableHtml;

        try {
            if(statusElement) statusElement.innerHTML = `<span style="color:#2980b9;">⏳ MIS ডাটা স্ক্র্যাপ হচ্ছে...</span>`;
            let misDataMap = await fetchDatesViaInvisibleFrame('MIS', level, targetId, branchesToProcess);

            if(statusElement) statusElement.innerHTML = `<span style="color:#2980b9;">⏳ AIS ডাটা স্ক্র্যাপ হচ্ছে...</span>`;
            let aisDataMap = await fetchDatesViaInvisibleFrame('AIS', level, targetId, branchesToProcess);

            let currentCount = 0;
            let overdueCount = 0;

            for (let b of branchesToProcess) {
                let bCodeMatch = b.name.match(/(?:^|-|\s)(\d{3,4})(?:$|-|\s)/);
                let bCode = bCodeMatch ? bCodeMatch[1] : b.name.replace(/[^a-z]/gi, '').toLowerCase();

                let aisDate = aisDataMap[bCode] || aisDataMap['mybranch'] || aisDataMap['self'] || aisDataMap['default'] || (branchesToProcess.length === 1 ? Object.values(aisDataMap)[0] : null) || "N/A";
                let misDate = misDataMap[bCode] || misDataMap['mybranch'] || misDataMap['self'] || misDataMap['default'] || (branchesToProcess.length === 1 ? Object.values(misDataMap)[0] : null) || "N/A";

                let aisLag = calculateLag(aisDate);
                let misLag = calculateLag(misDate);

                let isOverdue = (typeof misLag === 'number' && misLag > 0) || (typeof aisLag === 'number' && aisLag > 0) || misDate === "N/A" || aisDate === "N/A";
                if (isOverdue) overdueCount++; else currentCount++;

                let aisLagColor = aisLag > 2 ? '#c0392b' : (aisLag > 0 ? '#d35400' : '#27ae60');
                let misLagColor = misLag > 2 ? '#c0392b' : (misLag > 0 ? '#d35400' : '#27ae60');

                let isMismatch = (misDate !== "N/A" && aisDate !== "N/A" && misDate !== aisDate);
                let rowBg = isMismatch ? "background:#fdedec;" : (isOverdue ? "background:#fff5f5;" : "");
                
                let badgeHtml = isOverdue ? `<span style="color:#c0392b; font-weight:bold;">[🔴 বিলম্ব] </span>` : `<span style="color:#27ae60; font-weight:bold;">[✅] </span>`;
                let cleanName = `${badgeHtml}${b.name}`;

                let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, '');
                
                let trElement = document.getElementById(`bde-tr-${safeId}`);
                if (trElement) {
                    trElement.setAttribute('data-status', isOverdue ? 'overdue' : 'current');
                    trElement.innerHTML = `
                        <tr style="${rowBg}">
                            <td style="text-align:left; padding:4px 3px; border:1px solid #bdc3c7; font-weight:bold; color:#2c3e50; white-space:normal; line-height:1.25; font-size:10px;">${cleanName}</td>
                            <td style="padding:3px 1px; border:1px solid #bdc3c7; color:${misDate === 'N/A'?'#e74c3c':'#2980b9'}; font-weight:bold; background:#f4f9f9; font-size:9.5px; white-space:nowrap; overflow:hidden;">${misDate}</td>
                            <td style="padding:3px 1px; border:1px solid #bdc3c7; color:${misLagColor}; font-weight:bold; background:#f4f9f9; font-size:10px; white-space:nowrap;">${misLag}</td>
                            <td style="padding:3px 1px; border:1px solid #bdc3c7; color:${aisDate === 'N/A'?'#e74c3c':'#27ae60'}; font-weight:bold; background:#f9fbf9; font-size:9.5px; white-space:nowrap; overflow:hidden;">${aisDate}</td>
                            <td style="padding:3px 1px; border:1px solid #bdc3c7; color:${aisLagColor}; font-weight:bold; background:#f9fbf9; font-size:10px; white-space:nowrap;">${aisLag}</td>
                        </tr>
                    `;
                }
            }

            // 🌟 Update Slim Tabs Counts
            let tabsBar = document.getElementById('bde-tabs-bar');
            if (tabsBar) {
                tabsBar.style.display = 'flex';
                document.getElementById('bde-lbl-all').innerText = (currentCount + overdueCount);
                document.getElementById('bde-lbl-overdue').innerText = overdueCount;
            }

            if(statusElement) statusElement.innerHTML = `<span style="color:green;">✅ সব শাখার ডেট ও Lag স্ক্যান সম্পন্ন!</span>`;
            
        } catch(e) {
            console.error(e);
            if(statusElement) statusElement.innerHTML = `<span style="color:red;">❌ স্ক্যানিংয়ে সমস্যা হয়েছে!</span>`;
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
            isBdeBtnClosed = false;
            if (btn) btn.remove();
            if (panel) panel.remove();
        }
    }, 1500);

})();

// ========================================================================
// EXTENSION 2: 🚀 MIS & AIS Checker-DSK_IT (Full Screen & Zero Digit Clip)
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
        for(let i=0; i<80; i++) {
            let el = doc.querySelector(selector);
            if (el && el.options.length > minLen) return el;
            await new Promise(r => setTimeout(r, 100));
        }
        return doc.querySelector(selector);
    }

    function syncLocations(statusCallback) {
        return new Promise((resolve) => {
            if (statusCallback) statusCallback("সেন্ট্রাল সিঙ্ক হচ্ছে...");
            if (window.runGlobalHierarchySync) {
                window.runGlobalHierarchySync(true, (success) => resolve(success));
            } else {
                resolve(false);
            }
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
            let uType = sessionStorage.getItem('mf_user_type') || 'HO';

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
                                await new Promise(r => setTimeout(r, 800)); 
                            }
                            let targetSelector = reportLevel === '3' ? 'select[name="cbo_zone"]' : (reportLevel === '2' ? 'select[name="cbo_area"]' : 'select[name="cbo_branch"]');
                            let targetSel = await waitForOptions(doc, targetSelector);
                            if (targetSel && targetId !== 'ALL') {
                                triggerVueChange(targetSel, targetId, win);
                                await new Promise(r => setTimeout(r, 800)); 
                            }
                        } 
                        else if (uType === 'AREA') {
                            let targetSel = await waitForOptions(doc, 'select[name="cbo_branch"]');
                            if (targetSel && targetId !== 'ALL') {
                                triggerVueChange(targetSel, targetId, win);
                                await new Promise(r => setTimeout(r, 800)); 
                            }
                        }

                        if (type === 'mis') {
                            let samitySel = doc.querySelector('select[name="cbo_samity"]');
                            if (samitySel) {
                                triggerVueChange(samitySel, "-1", win); 
                                await new Promise(r => setTimeout(r, 500));
                            }
                            triggerVueChange(doc.querySelector('select[name="cbo_service_charge"]'), "1", win);
                            triggerVueChange(doc.querySelector('select[name="cbo_funding_organization"]'), "-1", win);
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
                                }, 400);
                            }, 1000);
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
                                }, 400);
                            }, 1000);
                        }
                    } catch(e) { clearTimeout(timeout); iframe.remove(); resolve(null); }
                }, 2000);
            };
        });
    }

    let isMisAisBtnClosed = false;
    function initMisAisToggleBtn() {
        if (!window.location.hash.includes('dashboard')) return;
        if (isMisAisBtnClosed || document.getElementById('mis-ais-toggle-btn')) return;
        
        let container = document.createElement('div');
        container.id = 'mis-ais-toggle-btn';
        container.style.cssText = 'position:fixed; bottom:210px; right:16px; display:flex; align-items:center; background:#2c3e50; color:white; border-radius:50px; padding:8px 14px; font-weight:bold; font-size:13px; box-shadow:0 4px 14px rgba(0,0,0,0.4); z-index:999998; font-family:Arial; transition:all 0.3s ease; cursor:pointer;';
        
        let textSpan = document.createElement('span');
        textSpan.innerText = '🚀 MIS & AIS Checker-DSK_IT';
        textSpan.style.cssText = 'margin-right:8px; pointer-events:none;';

        let closeBtn = document.createElement('button');
        closeBtn.innerText = '✕';
        closeBtn.title = 'বন্ধ করুন';
        closeBtn.style.cssText = 'background: rgba(255,255,255,0.25); color:white; border:none; width:20px; height:20px; border-radius:50%; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; outline:none; transition:0.2s;';
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,0,0,0.8)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.25)';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            isMisAisBtnClosed = true;
            container.remove();
            let p = document.getElementById('ghost-audit-panel');
            if(p) p.remove();
        };

        container.onclick = () => openMisAisPanel();
        container.appendChild(textSpan);
        container.appendChild(closeBtn);
        document.body.appendChild(container);
    }

    function openMisAisPanel() {
        if (document.getElementById('ghost-audit-panel')) return;

        const panel = document.createElement('div');
        panel.id = 'ghost-audit-panel';
        panel.style.cssText = 'position: fixed; top: 5px; left: 50%; transform: translateX(-50%); background: #fff; border: 2px solid #2c3e50; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.45); width: 98vw; max-width: 750px; font-family: Arial; z-index: 999999; overflow: hidden;';
        document.body.appendChild(panel);

        panel.innerHTML = `
            <div id="ghost-header" style="background:#2c3e50; color:white; padding:8px 12px; cursor:move; display:flex; justify-content:space-between; align-items:center;">
                <strong id="panel-title" style="font-size:13px; pointer-events:none; white-space:nowrap;">🚀 MIS & AIS Checker-DSK_IT</strong>
                <div style="display:flex; align-items:center; gap:8px;">
                    <button id="sync-locations-btn" style="background:#f39c12; border:none; color:white; font-size:11px; cursor:pointer; padding:3px 8px; border-radius:3px; font-weight:bold;">🔄 Sync</button>
                    <button id="ghost-close" title="বন্ধ করুন" style="background: linear-gradient(135deg, #ff416c, #ff4b2b); color: white; border: none; width: 26px; height: 26px; border-radius: 50%; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 6px rgba(255, 65, 108, 0.45); transition: all 0.2s ease;">✕</button>
                </div>
            </div>
            
            <div id="ghost-body" style="padding:6px; overflow-y:auto; max-height: 88vh; display: block;">
                <div style="display:flex; gap:4px; margin-bottom:4px; align-items:flex-end;" id="controls-container">
                </div>
                <button id="start-audit-btn" style="width:100%; background:#27ae60; color:white; border:none; padding:6px; font-weight:bold; font-size:13px; border-radius:3px; cursor:pointer; transition:0.2s;">🚀 Start Audit Process</button>
                <div id="audit-status" style="margin-top:4px; font-size:11px; font-weight:bold; color:#d35400; text-align:center; min-height:15px;"></div>
                <div id="audit-output" style="margin-top:4px;"></div>
                <button id="export-excel-btn" style="display:none; width:100%; background:#8e44ad; color:white; border:none; padding:6px; margin-top:4px; font-weight:bold; font-size:13px; border-radius:3px; cursor:pointer; transition:0.2s;">📥 Download Excel</button>
            </div>
        `;

        document.getElementById('ghost-close').onclick = () => panel.remove();

        function renderUI() {
            let uType = sessionStorage.getItem('mf_user_type');
            let container = document.getElementById('controls-container');
            let dateHtml = `
                <div style="flex:1;">
                    <label style="font-size:10px; font-weight:bold; color:#34495e;">📅 তারিখ:</label>
                    <input type="date" id="custom-audit-date" style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-family:Arial; cursor:pointer; font-size:11px; height:24px;" value="${getToday()}">
                </div>
            `;

            document.getElementById('panel-title').innerText = "🚀 MIS & AIS Checker-DSK_IT";

            if (uType === 'BRANCH') {
                container.innerHTML = dateHtml; 
            } 
            else if (uType === 'AREA') {
                container.innerHTML = `
                    <div style="flex:1.5;">
                        <label style="font-size:10px; font-weight:bold; color:#34495e;">🏢 নির্বাচন:</label>
                        <select id="custom-target" style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-size:11px; height:24px;">
                            <option value="ALL">-- 🚀 All Branches (Batch) --</option>
                        </select>
                    </div>
                    ${dateHtml}
                `;
                populateTargets();
            } 
            else { 
                let zones = JSON.parse(sessionStorage.getItem('mf_cached_zones') || '[]');
                let areas = JSON.parse(sessionStorage.getItem('mf_cached_areas') || '[]');
                
                let levelOptions = `<option value="1">শাখা</option>`;
                if (areas.length > 0) levelOptions += `<option value="2">অঞ্চল</option>`;
                if (zones.length > 0) levelOptions += `<option value="3" selected>জোন</option>`;
                else if (areas.length > 0) levelOptions = levelOptions.replace('value="2"', 'value="2" selected');
                else levelOptions = levelOptions.replace('value="1"', 'value="1" selected');

                container.innerHTML = `
                    <div style="flex:0.8;">
                        <label style="font-size:10px; font-weight:bold; color:#34495e;">📍 লেভেল:</label>
                        <select id="custom-level" style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-size:11px; height:24px;">
                            ${levelOptions}
                        </select>
                    </div>
                    <div style="flex:1.4;">
                        <label style="font-size:10px; font-weight:bold; color:#34495e;">🏢 নির্বাচন:</label>
                        <select id="custom-target" style="width:100%; padding:3px; border:1px solid #bdc3c7; border-radius:3px; font-size:11px; height:24px;">
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
            
            let uType = sessionStorage.getItem('mf_user_type');
            let data = [];

            if (uType === 'BRANCH') return;

            let level = document.getElementById('custom-level') ? document.getElementById('custom-level').value : '1';
            
            targetSel.innerHTML = '<option value="ALL" selected>🚀 Select All</option>';
            
            if (uType === 'AREA') {
                data = JSON.parse(sessionStorage.getItem('mf_cached_branches') || localStorage.getItem('microfin_branch_list') || '[]');
            } else {
                if (level === '3') data = JSON.parse(sessionStorage.getItem('mf_cached_zones') || '[]');
                else if (level === '2') data = JSON.parse(sessionStorage.getItem('mf_cached_areas') || '[]');
                else if (level === '1') data = JSON.parse(sessionStorage.getItem('mf_cached_branches') || localStorage.getItem('microfin_branch_list') || '[]');
            }
            
            if(data.length > 0) {
                data.forEach(item => { targetSel.innerHTML += `<option value="${item.id}">${item.name}</option>`; });
            }
        }

        renderUI();
        window.addEventListener('mf_central_sync_completed', () => {
            renderUI();
            populateTargets();
        });

        if (!sessionStorage.getItem('mf_auto_synced') || !sessionStorage.getItem('mf_user_type')) {
            if (window.runGlobalHierarchySync) {
                window.runGlobalHierarchySync(false, () => { renderUI(); populateTargets(); });
            }
        }

        document.getElementById('sync-locations-btn').onclick = () => {
            document.getElementById('audit-status').innerHTML = `<span style="color:#f39c12;">⏳ সিংক হচ্ছে...</span>`;
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

            let csvContent = "\uFEFF"; // UTF-8 BOM for perfect Bengali & Emoji support
            table.querySelectorAll('tr').forEach(row => {
                if (row.style.display === 'none' || (row.parentElement && row.parentElement.style.display === 'none')) return;
                let rowData = [];
                row.querySelectorAll('th, td').forEach(col => {
                    let text = "";
                    if (col.querySelector('.manual-retry-btn')) {
                        let clone = col.cloneNode(true);
                        clone.querySelectorAll('.manual-retry-btn').forEach(btn => btn.remove());
                        text = clone.innerText || clone.textContent || "";
                    } else {
                        text = col.innerText || col.textContent || "";
                    }
                    text = text.replace(/[\r\n]+/g, ' ').replace(/"/g, '""').trim();
                    rowData.push(`"${text}"`);
                });
                if (rowData.length > 0) csvContent += rowData.join(",") + "\r\n";
            });
            
            let uType = sessionStorage.getItem('mf_user_type');
            let targetName = "Branch";
            if(uType !== 'BRANCH') {
                let targetSel = document.getElementById('custom-target');
                targetName = targetSel.options[targetSel.selectedIndex].text;
                if(targetSel.value === 'ALL') targetName = "All_Batch";
            }
            
            let targetDate = document.getElementById('custom-audit-date').value;
            let fileName = `Audit_Report_${targetName.replace(/\s+/g, '_')}_${targetDate}.csv`;

            if (window.AndroidDownloader && window.AndroidDownloader.saveExcel) {
                window.AndroidDownloader.saveExcel(csvContent, fileName);
            } else {
                let blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
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
                        <td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9.5px;">${bName}</td>
                        <td colspan="4" style="text-align:center; color:#d35400; font-size:9.5px;">🔄 রিট্রাই চলছে...</td>
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
                    if(t2) t2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9.5px;">${bName}</td><td colspan="4" style="text-align:center; color:#27ae60; font-size:9.5px;">🔄 AIS রিড হচ্ছে...</td></tr>`;
                    
                    aData = await scrapeViaGhost('#/reports/acc-balance-sheets/balance-sheet-report-filter', sDate, '1', bId, 'ais', updateStatus);
                }

                let tbodyAfter = document.getElementById(`tbody-${safeId}`);
                if(!tbodyAfter) return;

                if (mData && aData) {
                    let lDiff = (mData.loan || 0) - (aData.loan || 0);
                    let sDiff = (mData.savings || 0) - (aData.savings || 0);
                    
                    tbodyAfter.innerHTML = `
                        <tr>
                            <td rowspan="5" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; background:#f4f9f4; font-size:9.5px;">${bName}</td>
                            <td style="text-align:left; font-size:9px;"><b>Loan</b></td>
                            <td style="white-space:nowrap; font-size:9px;">${formatNum(mData.loan)}</td>
                            <td style="white-space:nowrap; font-size:9px;">${formatNum(aData.loan)}</td>
                            <td style="color:${lDiff===0?'green':'red'}; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(lDiff)}</td>
                        </tr>
                        <tr>
                            <td style="text-align:left; font-size:9px;"><b>Savings</b></td>
                            <td style="white-space:nowrap; font-size:9px;">${formatNum(mData.savings)}</td>
                            <td style="white-space:nowrap; font-size:9px;">${formatNum(aData.savings)}</td>
                            <td style="color:${sDiff===0?'green':'red'}; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(sDiff)}</td>
                        </tr>
                        <tr style="background:#fcfcfc;">
                            <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Cash</b></td>
                            <td style="color:gray;">-</td>
                            <td style="color:#16a085; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aData.cashInHand)}</td>
                            <td style="color:gray;">-</td>
                        </tr>
                        <tr style="background:#fcfcfc;">
                            <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Bank</b></td>
                            <td style="color:gray;">-</td>
                            <td style="color:#16a085; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aData.cashAtBank)}</td>
                            <td style="color:gray;">-</td>
                        </tr>
                        <tr style="background:#fcfcfc;">
                            <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Equity</b></td>
                            <td style="color:gray;">-</td>
                            <td style="color:#8e44ad; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aData.equity)}</td>
                            <td style="color:gray;">-</td>
                        </tr>
                    `;
                    updateStatus(`✅ ম্যানুয়াল রিট্রাই সফল!`);
                } else {
                    tbodyAfter.innerHTML = `
                        <tr>
                            <td style="text-align:left; font-weight:bold; color:#e74c3c; font-size:9.5px;">${bName}</td>
                            <td colspan="3" style="text-align:center; color:red; font-size:9.5px;">❌ ব্যর্থ!</td>
                            <td style="text-align:center;">
                                <button class="manual-retry-btn" data-id="${bId}" data-name="${bName}" style="background:#e74c3c; color:white; border:none; padding:2px 6px; font-size:9.5px; border-radius:2px; cursor:pointer;">🔄 Retry</button>
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
            let uType = sessionStorage.getItem('mf_user_type');
            
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
                    if (reportLevel === '3') branchesToProcess = JSON.parse(sessionStorage.getItem('mf_cached_branches') || '[]');
                    else if (reportLevel === '2') branchesToProcess = JSON.parse(sessionStorage.getItem('mf_cached_branches') || '[]');
                    else if (reportLevel === '1') branchesToProcess = JSON.parse(sessionStorage.getItem('mf_cached_branches') || '[]');
                } else {
                    if (reportLevel === '1') isBatchMode = false;
                    else {
                        isBatchMode = true;
                        let allBranches = JSON.parse(sessionStorage.getItem('mf_cached_branches') || '[]');
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
                    branchesToProcess = JSON.parse(sessionStorage.getItem('mf_cached_branches') || '[]');
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
            
            status.innerHTML = `<div style="display:inline-block; width:10px; height:10px; border:2px solid #f3f3f3; border-top:2px solid #d35400; border-radius:50%; animation:spin 1s linear infinite; vertical-align:middle; margin-right:4px;"></div> <span id="status-text">প্রসেসিং শুরু হচ্ছে...</span>`;
            
            const updateStatus = (msg) => { 
                let stEl = document.getElementById('status-text');
                if(stEl) stEl.innerText = msg; 
            };

            const tableStyle = `
                <style>
                    .audit-table { width:100%; border-collapse:collapse; font-size:9.5px; text-align:right; table-layout:fixed; }
                    .audit-table th { border: 1px solid #bdc3c7; padding: 3px 2px; text-align:center; overflow:hidden; }
                    .audit-table td { border: 1px solid #bdc3c7; padding: 3px 2px; }
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
                        <div style="max-height:60vh; overflow-y:auto;">
                        <table class="audit-table">
                            <thead style="background:#2c3e50; color:white; position:sticky; top:0; z-index:1;">
                                <tr>
                                    <th style="width:24%; text-align:left;">Branch</th>
                                    <th style="width:14%; text-align:left;">Item</th>
                                    <th style="width:20%;">MIS</th>
                                    <th style="width:20%;">AIS</th>
                                    <th style="width:22%;">Diff.</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td rowspan="5" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; background:#f4f9f4; font-size:9.5px;">${targetName}</td>
                                    <td style="text-align:left; font-size:9px;"><b>Loan</b></td>
                                    <td style="white-space:nowrap; font-size:9px;">${formatNum(misData.loan)}</td>
                                    <td style="white-space:nowrap; font-size:9px;">${formatNum(aisData.loan)}</td>
                                    <td style="color:${loanDiff===0?'green':'red'}; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(loanDiff)}</td>
                                </tr>
                                <tr>
                                    <td style="text-align:left; font-size:9px;"><b>Savings</b></td>
                                    <td style="white-space:nowrap; font-size:9px;">${formatNum(misData.savings)}</td>
                                    <td style="white-space:nowrap; font-size:9px;">${formatNum(aisData.savings)}</td>
                                    <td style="color:${savDiff===0?'green':'red'}; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(savDiff)}</td>
                                </tr>
                                <tr style="background:#fcfcfc;">
                                    <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Cash</b></td>
                                    <td style="color:gray;">-</td>
                                    <td style="color:#16a085; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aisData.cashInHand)}</td>
                                    <td style="color:gray;">-</td>
                                </tr>
                                <tr style="background:#fcfcfc;">
                                    <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Bank</b></td>
                                    <td style="color:gray;">-</td>
                                    <td style="color:#16a085; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aisData.cashAtBank)}</td>
                                    <td style="color:gray;">-</td>
                                </tr>
                                <tr style="background:#fcfcfc;">
                                    <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Equity</b></td>
                                    <td style="color:gray;">-</td>
                                    <td style="color:#8e44ad; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aisData.equity)}</td>
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
                    <div style="max-height:60vh; overflow-y:auto;">
                    <table class="audit-table">
                        <thead style="background:#2c3e50; color:white; position:sticky; top:0; z-index:1;">
                            <tr>
                                <th style="width:24%; text-align:left;">Branch</th>
                                <th style="width:14%; text-align:left;">Item</th>
                                <th style="width:20%;">MIS</th>
                                <th style="width:20%;">AIS</th>
                                <th style="width:22%;">Diff.</th>
                            </tr>
                        </thead>
                `;
                for(let b of branchesToProcess) {
                    let safeId = b.id.toString().replace(/[^a-zA-Z0-9]/g, '');
                    tableHtml += `
                        <tbody id="tbody-${safeId}">
                            <tr style="background:#fff;">
                                <td style="text-align:left; font-weight:bold; color:#2c3e50; font-size:9.5px;">${b.name}</td>
                                <td colspan="4" style="text-align:center; color:gray; font-size:9.5px;">⏳ অপেক্ষমান...</td>
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
                                <td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9.5px;">${b.name}</td>
                                <td colspan="4" style="text-align:center; color:#d35400; font-size:9.5px;">🔄 MIS রিড হচ্ছে...</td>
                            </tr>
                        `;
                    }

                    let mData = await scrapeViaGhost('#/reports/member-migration-balances/member-migration-balance-index', selectedDate, '1', b.id, 'mis', updateStatus);
                    if (!mData) {
                        let tRetry1 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry1) tRetry1.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9.5px;">${b.name}</td><td colspan="4" style="text-align:center; color:#d35400; font-size:9.5px;">🔄 MIS অটো-রিট্রাই...</td></tr>`;
                        
                        mData = await scrapeViaGhost('#/reports/member-migration-balances/member-migration-balance-index', selectedDate, '1', b.id, 'mis', updateStatus);
                    }

                    let aData = null;
                    if (mData) {
                        let tRetry2 = document.getElementById(`tbody-${safeId}`);
                        if(tRetry2) tRetry2.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#2980b9; font-size:9.5px;">${b.name}</td><td colspan="4" style="text-align:center; color:#27ae60; font-size:9.5px;">🔄 AIS রিড হচ্ছে...</td></tr>`;
                        
                        aData = await scrapeViaGhost('#/reports/acc-balance-sheets/balance-sheet-report-filter', selectedDate, '1', b.id, 'ais', updateStatus);
                        if (!aData) {
                            let tRetry3 = document.getElementById(`tbody-${safeId}`);
                            if(tRetry3) tRetry3.innerHTML = `<tr><td style="text-align:left; font-weight:bold; color:#e67e22; font-size:9.5px;">${b.name}</td><td colspan="4" style="text-align:center; color:#d35400; font-size:9.5px;">🔄 AIS অটো-রিট্রাই...</td></tr>`;
                            
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
                                <td rowspan="5" style="text-align:left; font-weight:bold; color:#27ae60; vertical-align:middle; background:#f4f9f4; font-size:9.5px;">${b.name}</td>
                                <td style="text-align:left; font-size:9px;"><b>Loan</b></td>
                                <td style="white-space:nowrap; font-size:9px;">${formatNum(mData.loan)}</td>
                                <td style="white-space:nowrap; font-size:9px;">${formatNum(aData.loan)}</td>
                                <td style="color:${lDiff===0?'green':'red'}; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(lDiff)}</td>
                            </tr>
                            <tr>
                                <td style="text-align:left; font-size:9px;"><b>Savings</b></td>
                                <td style="white-space:nowrap; font-size:9px;">${formatNum(mData.savings)}</td>
                                <td style="white-space:nowrap; font-size:9px;">${formatNum(aData.savings)}</td>
                                <td style="color:${sDiff===0?'green':'red'}; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(sDiff)}</td>
                            </tr>
                            <tr style="background:#fcfcfc;">
                                <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Cash</b></td>
                                <td style="color:gray;">-</td>
                                <td style="color:#16a085; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aData.cashInHand)}</td>
                                <td style="color:gray;">-</td>
                            </tr>
                            <tr style="background:#fcfcfc;">
                                <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Bank</b></td>
                                <td style="color:gray;">-</td>
                                <td style="color:#16a085; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aData.cashAtBank)}</td>
                                <td style="color:gray;">-</td>
                            </tr>
                            <tr style="background:#fcfcfc;">
                                <td style="text-align:left; color:#2c3e50; font-size:9px;"><b>Equity</b></td>
                                <td style="color:gray;">-</td>
                                <td style="color:#8e44ad; font-weight:bold; white-space:nowrap; font-size:9px;">${formatNum(aData.equity)}</td>
                                <td style="color:gray;">-</td>
                            </tr>
                        `;
                        successCount++;
                    } else {
                        tbodyAfter.innerHTML = `
                            <tr>
                                <td style="text-align:left; font-weight:bold; color:#e74c3c; font-size:9.5px;">${b.name}</td>
                                <td colspan="3" style="text-align:center; color:red; font-size:9.5px;">❌ ডাটা নেই</td>
                                <td style="text-align:center; vertical-align:middle;">
                                    <button class="manual-retry-btn" data-id="${b.id}" data-name="${b.name}" style="background:#e74c3c; color:white; border:none; padding:2px 6px; font-size:9.5px; border-radius:2px; cursor:pointer; font-weight:bold;">🔄 Retry</button>
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
            initMisAisToggleBtn();
        } else {
            isMisAisBtnClosed = false;
            let btn = document.getElementById('mis-ais-toggle-btn');
            if (btn) btn.remove();
            let p = document.getElementById('ghost-audit-panel');
            if (p) p.remove();
        }
    }, 1500);

})();

// ========================================================================
// 📊 3. HIERARCHICAL BRANCH REPORT (DASHBOARD MEMBER VERIFICATION MODULE)
// ========================================================================
(function() {
    'use strict';

    // 🌟 Ultra-Safe Storage Utilities (Error Proof)
    const storageUtil = {
        set: function(key, value, callback) {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    let obj = {}; obj[key] = value;
                    chrome.storage.local.set(obj, callback);
                    return;
                }
            } catch(e) { console.warn("Chrome storage not permitted. Using fallback."); }
            localStorage.setItem(key, JSON.stringify(value));
            if(callback) callback();
        },
        get: function(key, callback) {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get([key], function(result) {
                        if (chrome.runtime && chrome.runtime.lastError) {
                            let data = localStorage.getItem(key);
                            try { callback(data ? JSON.parse(data) : undefined); } catch(err) { callback(undefined); }
                        } else {
                            callback(result[key]);
                        }
                    });
                    return;
                }
            } catch(e) { console.warn("Chrome storage not permitted. Using fallback."); }
            try {
                let data = localStorage.getItem(key);
                callback(data ? JSON.parse(data) : undefined);
            } catch(err) { callback(undefined); }
        }
    };

    // ১. গ্লোবাল ভেরিয়েবল ও ইন্টারসেপ্টর
    let clonedUrl = null;
    let clonedHeaders = {};
    let isCapturing = false;
    let isSyncing = false; 
    let isToggleClosed = false; 

    const origOpen = XMLHttpRequest.prototype.open;
    const origSetHeader = XMLHttpRequest.prototype.setRequestHeader;
    const origSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function(method, url) { this._url = url; this._headers = {}; origOpen.apply(this, arguments); };
    XMLHttpRequest.prototype.setRequestHeader = function(name, value) { this._headers[name] = value; origSetHeader.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function(body) {
        if (this._url && (this._url.includes('cbo_branch') || this._url.includes('cbo_member_status') || (this._url.includes('members') && (this._url.includes('limit=') || this._url.includes('ajax') || this._url.includes('list'))))) {
            clonedUrl = this._url; 
            clonedHeaders = Object.assign({}, this._headers); 
            isCapturing = false;
            try {
                sessionStorage.setItem('mf_cloned_url', clonedUrl);
                sessionStorage.setItem('mf_cloned_headers', JSON.stringify(clonedHeaders));
                localStorage.setItem('mf_cloned_url_backup', clonedUrl);
                localStorage.setItem('mf_cloned_headers_backup', JSON.stringify(clonedHeaders));
            } catch(e){}
            document.dispatchEvent(new Event('ApiCaptured'));
        }
        origSend.apply(this, arguments);
    };

    function triggerVueChange(el, value, win) {
        if (!el) return;
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        if (win && win.jQuery) win.jQuery(el).trigger('change');
    }

    // ২. ডাটা ম্যানেজমেন্ট (Safe Parsing)
    function getMappings() {
        let aMap = {}, zMap = {};
        try { aMap = JSON.parse(localStorage.getItem('microfin_aMap') || '{}'); } catch(e){}
        try { zMap = JSON.parse(localStorage.getItem('microfin_zMap') || '{}'); } catch(e){}
        return {
            aMap: aMap,
            zMap: zMap,
            role: localStorage.getItem('microfin_role') || 'BRANCH'
        };
    }

    // ৩. Role-Based Central Master Sync Delegation
    function performZeroTouchSync(force = false) {
        if (window.runGlobalHierarchySync) {
            isSyncing = true;
            window.runGlobalHierarchySync(force, () => {
                isSyncing = false;
                document.querySelectorAll('.blockUI, .modal-backdrop, .blockOverlay, .sweet-overlay').forEach(el => el.remove());
            });
        }
    }

    // ব্যাকগ্রাউন্ড থেকে API ও ব্রাঞ্চ লিস্ট নিশ্চিতকরণ
    async function ensureApiAndBranchList(force = false) {
        let savedUrl = sessionStorage.getItem('mf_cloned_url') || localStorage.getItem('mf_cloned_url_backup');
        let savedBList = localStorage.getItem('microfin_branch_list');

        if (force || !savedUrl || !savedBList || JSON.parse(savedBList || '[]').length === 0) {
            let status = document.getElementById('status-text');
            if (status) status.innerText = "Connecting to member servers via background tab...";
            
            await new Promise((resolve) => {
                let ifr = document.createElement('iframe');
                ifr.style.cssText = 'position:fixed; top:0px; left:-9999px; width:100px; height:100px;';
                ifr.src = window.location.origin + window.location.pathname + '#/members/members/index';
                document.body.appendChild(ifr);

                let timer = setTimeout(() => { ifr.remove(); resolve(); }, 12000);

                ifr.onload = () => {
                    setTimeout(async () => {
                        try {
                            let win = ifr.contentWindow;
                            let doc = win.document || ifr.contentDocument;

                            // 🌟 Inject XHR & Fetch interceptors directly into iframe window so background capture works!
                            try {
                                const ifrOpen = win.XMLHttpRequest.prototype.open;
                                const ifrSetHeader = win.XMLHttpRequest.prototype.setRequestHeader;
                                const ifrSend = win.XMLHttpRequest.prototype.send;
                                win.XMLHttpRequest.prototype.open = function(method, url) { this._url = url; this._headers = {}; ifrOpen.apply(this, arguments); };
                                win.XMLHttpRequest.prototype.setRequestHeader = function(name, value) { this._headers[name] = value; ifrSetHeader.apply(this, arguments); };
                                win.XMLHttpRequest.prototype.send = function(body) {
                                    if (this._url && (this._url.includes('cbo_branch') || this._url.includes('cbo_member_status') || (this._url.includes('members') && (this._url.includes('limit=') || this._url.includes('ajax') || this._url.includes('list'))))) {
                                        clonedUrl = this._url; 
                                        clonedHeaders = Object.assign({}, this._headers); 
                                        sessionStorage.setItem('mf_cloned_url', clonedUrl);
                                        sessionStorage.setItem('mf_cloned_headers', JSON.stringify(clonedHeaders));
                                        localStorage.setItem('mf_cloned_url_backup', clonedUrl);
                                        localStorage.setItem('mf_cloned_headers_backup', JSON.stringify(clonedHeaders));
                                    }
                                    ifrSend.apply(this, arguments);
                                };
                                const ifrFetch = win.fetch;
                                if (ifrFetch) {
                                    win.fetch = function(url, options) {
                                        let urlStr = (typeof url === 'string' ? url : (url && url.url ? url.url : '') || '');
                                        if (urlStr && (urlStr.includes('cbo_branch') || urlStr.includes('cbo_member_status') || (urlStr.includes('members') && (urlStr.includes('limit=') || urlStr.includes('ajax') || urlStr.includes('list'))))) {
                                            clonedUrl = urlStr;
                                            if (options && options.headers) clonedHeaders = Object.assign({}, options.headers);
                                            sessionStorage.setItem('mf_cloned_url', clonedUrl);
                                            sessionStorage.setItem('mf_cloned_headers', JSON.stringify(clonedHeaders));
                                            localStorage.setItem('mf_cloned_url_backup', clonedUrl);
                                            localStorage.setItem('mf_cloned_headers_backup', JSON.stringify(clonedHeaders));
                                        }
                                        return ifrFetch.apply(this, arguments);
                                    };
                                }
                            } catch(hkErr) { console.error("Iframe hook error:", hkErr); }

                            let waitLimit = 25;
                            while(!doc.querySelector('#custom-search-btn') && waitLimit > 0) {
                                await new Promise(r => setTimeout(r, 500));
                                waitLimit--;
                            }

                            let cbo = doc.querySelector('select[name="cbo_branch"]');
                            let bList = [];
                            if (cbo && cbo.options.length > 1) {
                                bList = Array.from(cbo.options)
                                    .filter(o => o.value !== '' && o.value !== '1' && o.value !== '-1')
                                    .filter(o => !/area\b/i.test(o.text) && !/zone\b/i.test(o.text))
                                    .map(o => ({ id: o.value, name: o.text.trim() }));
                            } else {
                                let branchName = "My Branch";
                                let bInfo = doc.querySelector('.branch_info') || document.querySelector('.branch_info');
                                if(bInfo) {
                                    let match = bInfo.innerText.match(/Branch:\s*(.*)/i);
                                    if(match && match[1]) branchName = match[1].split('\n')[0].trim();
                                }
                                let bId = doc.querySelector('input[name="cbo_branch"]')?.value || (cbo ? cbo.value : '') || '';
                                if (bId === 'SELF' || bId === '-1' || bId === '0') bId = '';
                                bList = [{ id: bId, name: branchName, area: 'Branch', zone: 'Branch' }];
                            }
                            if (bList.length > 0) {
                                localStorage.setItem('microfin_branch_list', JSON.stringify(bList));
                            }

                            let sBtn = doc.querySelector('#custom-search-btn');
                            if (sBtn) {
                                if(cbo) cbo.dispatchEvent(new Event('change', { bubbles: true }));
                                sBtn.click();
                                let checks = 0;
                                while (!sessionStorage.getItem('mf_cloned_url') && !localStorage.getItem('mf_cloned_url_backup') && checks < 20) {
                                    await new Promise(r => setTimeout(r, 150));
                                    checks++;
                                }
                                await new Promise(r => setTimeout(r, 500));
                            }
                        } catch(e) { console.error("Iframe sync error:", e); }
                        clearTimeout(timer);
                        ifr.remove();
                        resolve();
                    }, 1500);
                };
            });
        }
    }

    // ৪. API ডেটা ফেচার (Strict & Proven Logic)
    async function fetchMemberCount(branchId, nidStatus) {
        if (!clonedUrl) {
            clonedUrl = sessionStorage.getItem('mf_cloned_url') || localStorage.getItem('mf_cloned_url_backup');
            try { 
                let savedHd = sessionStorage.getItem('mf_cloned_headers') || localStorage.getItem('mf_cloned_headers_backup');
                if(savedHd) clonedHeaders = JSON.parse(savedHd); 
            } catch(e){}
        }
        if(!clonedUrl) return 0;

        let urlObj = new URL(clonedUrl.startsWith('http') ? clonedUrl : window.location.origin + clonedUrl);
        urlObj.searchParams.set('limit', '1');
        if (branchId && branchId !== '' && branchId !== 'SELF' && branchId !== '0' && branchId !== '-1') {
            urlObj.searchParams.set('cbo_branch', branchId);
        } else if (!urlObj.searchParams.has('cbo_branch')) {
            urlObj.searchParams.set('cbo_branch', '');
        }
        urlObj.searchParams.set('cbo_nid_status', nidStatus);
        urlObj.searchParams.set('cbo_member_status', 'A'); 
        try {
            const response = await fetch(urlObj.toString(), { headers: clonedHeaders });
            const data = await response.json();
            return data.total_rows || 0;
        } catch (e) { return 0; }
    }

    // ড্যাশবোর্ডে ভাসমান বাটন
    function injectToggleBtn() {
        if (document.getElementById('member-report-toggle-btn')) return;
        
        let container = document.createElement('div');
        container.id = 'member-report-toggle-btn';
        container.style.cssText = 'position:fixed; bottom:160px; right:16px; display:flex; align-items:center; background:#8e44ad; color:white; border-radius:50px; padding:8px 14px; font-weight:bold; font-size:13px; box-shadow:0 4px 14px rgba(0,0,0,0.4); z-index:999998; font-family:Arial; transition:0.3s;';
        
        let textSpan = document.createElement('span');
        textSpan.innerText = '👥 Member Verification';
        textSpan.style.cssText = 'margin-right:8px; pointer-events:none;';

        container.onclick = () => injectUI();

        let closeBtn = document.createElement('button');
        closeBtn.innerText = '✕';
        closeBtn.title = 'বন্ধ করুন';
        closeBtn.style.cssText = 'background: rgba(255,255,255,0.25); color:white; border:none; width:20px; height:20px; border-radius:50%; font-size:11px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; padding:0; outline:none; transition:0.2s;';
        closeBtn.onmouseover = () => closeBtn.style.background = 'rgba(255,0,0,0.8)';
        closeBtn.onmouseout = () => closeBtn.style.background = 'rgba(255,255,255,0.25)';
        closeBtn.onclick = (e) => {
            e.stopPropagation();
            isToggleClosed = true;
            container.remove();
            let p = document.getElementById('auto-report-panel');
            if(p) p.remove();
        };

        container.appendChild(textSpan);
        container.appendChild(closeBtn);
        document.body.appendChild(container);
    }

    // ৫. প্যানেল ইনজেকশন ও ট্রি রেন্ডারিং ইঞ্জিন
    function injectUI() {
        try {
            if (document.getElementById('auto-report-panel')) return;
            
            const maps = getMappings();
            const syncStatus = localStorage.getItem('microfin_sync_status');
            const isReady = syncStatus === 'DONE';

            const panel = document.createElement('div');
            panel.id = 'auto-report-panel';
            panel.style.cssText = 'position: fixed; bottom: 20px; right: 20px; background: #fff; border: 2px solid #8e44ad; border-radius: 8px; padding: 15px; z-index: 999999; box-shadow: 0 10px 30px rgba(0,0,0,0.35); width: 480px; max-width: 95vw; font-family: Arial;';

            let filterHtml = '';
            if (isReady) {
                if (maps.role === 'HO') {
                    let zones = [...new Set(Object.values(maps.zMap))].filter(Boolean).sort();
                    filterHtml = `
                        <select id="filter-selection" style="width:100%; padding:8px; margin-bottom:10px; font-weight:bold; border:1px solid #ccc; border-radius:4px;">
                            <option value="ALL">🌐 Generate All Zones</option>
                            ${zones.map(z => `<option value="${z}">${z}</option>`).join('')}
                        </select>
                    `;
                } else if (maps.role === 'ZONE') {
                    let areas = [...new Set(Object.values(maps.aMap))].filter(Boolean).sort();
                    filterHtml = `
                        <select id="filter-selection" style="width:100%; padding:8px; margin-bottom:10px; font-weight:bold; border:1px solid #ccc; border-radius:4px;">
                            <option value="ALL">🌐 Generate All Areas</option>
                            ${areas.map(a => `<option value="${a}">${a}</option>`).join('')}
                        </select>
                    `;
                }
            }

            panel.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; background:#8e44ad; color:white; padding:8px 12px; border-radius:5px; margin:-15px -15px 12px -15px;">
                    <strong style="font-size:15px; margin:0;">👥 Member Verification Report</strong>
                    <div style="display:flex; gap:6px; align-items:center;">
                        <button id="resync-btn" style="background:#f39c12; color:white; border:none; padding:4px 8px; font-size:11px; cursor:pointer; border-radius:3px; font-weight:bold;">🔄 Resync</button>
                        <button id="close-panel-btn" style="background: linear-gradient(135deg, #ff416c, #ff4b2b); color: white; border: none; width: 24px; height: 24px; border-radius: 50%; font-size: 13px; font-weight: bold; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 5px rgba(255, 65, 108, 0.45); transition: 0.2s;">✕</button>
                    </div>
                </div>
                ${filterHtml}
                <button id="gen-btn" style="width:100%; background:${isReady ? '#8e44ad' : '#ccc'}; color:white; border:none; padding:10px; cursor:${isReady ? 'pointer' : 'not-allowed'}; font-weight:bold; border-radius:4px; font-size:14px;" ${!isReady ? 'disabled' : ''}>🚀 Generate Tree Report</button>

                <div id="status-text" style="margin-top:10px; font-size:12px; font-weight:bold; text-align:center; color:#2c3e50;"></div>
                <div id="table-container" style="max-height:300px; overflow:auto; margin-top:10px;"></div>
                <button id="export-btn" style="display:none; width:100%; background:#27ae60; color:white; border:none; padding:10px; margin-top:10px; font-weight:bold; border-radius:4px; font-size:14px;">📥 Download Excel</button>
            `;
            document.body.appendChild(panel);

            document.getElementById('resync-btn').onclick = () => {
                isSyncing = true;
                panel.remove();
                document.querySelectorAll('.blockUI, .modal-backdrop, .blockOverlay, .sweet-overlay').forEach(el => el.remove());
                sessionStorage.removeItem('mf_global_hierarchy_synced');
                sessionStorage.removeItem('mf_auto_synced');
                sessionStorage.removeItem('mf_cloned_url');
                sessionStorage.removeItem('mf_user_type');
                localStorage.removeItem('microfin_zMap');
                localStorage.removeItem('microfin_aMap');
                localStorage.removeItem('microfin_role');
                localStorage.removeItem('microfin_branch_list');
                localStorage.removeItem('microfin_sync_status');
                localStorage.removeItem('mf_cloned_url_backup');
                performZeroTouchSync(true);
            };

            document.getElementById('close-panel-btn').onclick = () => {
                panel.remove();
            };

            if(isReady) {
                const renderTable = function(report) {
                    const { maps, rawBranches, fetchedCounts } = report;
                    let now = new Date();
                    let dtString = now.toLocaleDateString('en-GB') + ' ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

                    let html = `<table id="reportTable" border="1" style="width:100%; border-collapse:collapse; font-size:12px;">
                        <tr style="background:#e8f4f8; color:#2980b9;">
                            <td colspan="4" style="padding:8px; font-size:13px; text-align:center; font-weight:bold;">
                                🕒 Report Generated On: ${dtString}
                            </td>
                        </tr>
                        <tr style="background:#ddd;">
                            <th style="white-space:nowrap; padding:5px;">Hierarchy & Branch</th>
                            <th style="padding:5px;">Active Member</th>
                            <th style="padding:5px;">Verified Member</th>
                            <th style="padding:5px;">Percentage</th>
                        </tr>`;

                    if (maps.role === 'HO') {
                        let tree = {};
                        rawBranches.forEach(b => {
                            if(!tree[b.zone]) tree[b.zone] = {};
                            if(!tree[b.zone][b.area]) tree[b.zone][b.area] = [];
                            tree[b.zone][b.area].push(b);
                        });
                        
                        for (let z in tree) {
                            html += `<tr style="background:#0277bd; color:white;"><td colspan="4" style="white-space:nowrap; padding:5px;"><b>🏢 Zone: ${z}</b></td></tr>`;
                            let zoneActive = 0, zoneVerified = 0;
                            
                            for (let a in tree[z]) {
                                html += `<tr style="background:#e1f5fe; color:#01579b;"><td colspan="4" style="white-space:nowrap; padding:5px;">&nbsp;&nbsp;&nbsp;<b>📍 Area: ${a}</b></td></tr>`;
                                let areaActive = 0, areaVerified = 0;
                                
                                for (let b of tree[z][a]) {
                                    let active = fetchedCounts[b.id].active;
                                    let verified = fetchedCounts[b.id].verified;
                                    let perc = active > 0 ? Math.round((verified / active) * 100) : 0;
                                    
                                    areaActive += active;
                                    areaVerified += verified;
                                    
                                    html += `<tr style="background:#fff;"><td style="white-space:nowrap; padding:5px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;🏷️ ${b.name}</td><td style="text-align:center; padding:5px;">${active}</td><td style="text-align:center; padding:5px;">${verified}</td><td style="text-align:center; padding:5px;"><b>${perc}%</b></td></tr>`;
                                }
                                let areaPerc = areaActive > 0 ? Math.round((areaVerified / areaActive) * 100) : 0;
                                html += `<tr style="background:#fff2e6; font-weight:bold;"><td style="text-align:left; white-space:nowrap; padding:5px;">&nbsp;&nbsp;&nbsp;📊 Total Area (${a})</td><td style="text-align:center; padding:5px;">${areaActive}</td><td style="text-align:center; padding:5px;">${areaVerified}</td><td style="text-align:center; color:#d35400; padding:5px;">${areaPerc}%</td></tr>`;
                                
                                zoneActive += areaActive;
                                zoneVerified += areaVerified;
                            }
                            let zonePerc = zoneActive > 0 ? Math.round((zoneVerified / zoneActive) * 100) : 0;
                            html += `<tr style="background:#e6f4ea; font-weight:bold;"><td style="text-align:left; white-space:nowrap; padding:5px;">📊 Total Zone (${z})</td><td style="text-align:center; padding:5px;">${zoneActive}</td><td style="text-align:center; padding:5px;">${zoneVerified}</td><td style="text-align:center; color:green; padding:5px;">${zonePerc}%</td></tr>`;
                        }
                    } 
                    else if (maps.role === 'ZONE') {
                        let tree = {};
                        rawBranches.forEach(b => {
                            if(!tree[b.area]) tree[b.area] = [];
                            tree[b.area].push(b);
                        });
                        for (let a in tree) {
                            html += `<tr style="background:#0277bd; color:white;"><td colspan="4" style="white-space:nowrap; padding:5px;"><b>📍 Area: ${a}</b></td></tr>`;
                            let areaActive = 0, areaVerified = 0;
                            
                            for (let b of tree[a]) {
                                let active = fetchedCounts[b.id].active;
                                let verified = fetchedCounts[b.id].verified;
                                let perc = active > 0 ? Math.round((verified / active) * 100) : 0;
                                
                                areaActive += active;
                                areaVerified += verified;
                                
                                html += `<tr style="background:#fff;"><td style="white-space:nowrap; padding:5px;">&nbsp;&nbsp;&nbsp;🏷️ ${b.name}</td><td style="text-align:center; padding:5px;">${active}</td><td style="text-align:center; padding:5px;">${verified}</td><td style="text-align:center; padding:5px;"><b>${perc}%</b></td></tr>`;
                            }
                            let areaPerc = areaActive > 0 ? Math.round((areaVerified / areaActive) * 100) : 0;
                            html += `<tr style="background:#fff2e6; font-weight:bold;"><td style="text-align:left; white-space:nowrap; padding:5px;">📊 Total Area (${a})</td><td style="text-align:center; padding:5px;">${areaActive}</td><td style="text-align:center; padding:5px;">${areaVerified}</td><td style="text-align:center; color:#d35400; padding:5px;">${areaPerc}%</td></tr>`;
                        }
                    } 
                    else { 
                        let grandActive = 0, grandVerified = 0;
                        
                        for (let b of rawBranches) {
                            let active = fetchedCounts[b.id].active;
                            let verified = fetchedCounts[b.id].verified;
                            let perc = active > 0 ? Math.round((verified / active) * 100) : 0;
                            
                            grandActive += active;
                            grandVerified += verified;
                            
                            html += `<tr style="background:#fff;"><td style="white-space:nowrap; padding:5px;"><span style="font-weight:bold; color:#2c3e50;">🏷️ ${b.name}</span></td><td style="text-align:center; padding:5px;">${active}</td><td style="text-align:center; padding:5px;">${verified}</td><td style="text-align:center; padding:5px;"><b>${perc}%</b></td></tr>`;
                        }
                        if (rawBranches.length > 1) {
                            let grandPerc = grandActive > 0 ? Math.round((grandVerified / grandActive) * 100) : 0;
                            html += `<tr style="background:#fff2e6; font-weight:bold;"><td style="text-align:left; white-space:nowrap; padding:5px;">📊 Grand Total</td><td style="text-align:center; padding:5px;">${grandActive}</td><td style="text-align:center; padding:5px;">${grandVerified}</td><td style="text-align:center; color:#d35400; padding:5px;">${grandPerc}%</td></tr>`;
                        }
                    }
                    html += `</table>`;
                    document.getElementById('table-container').innerHTML = html;
                };

                document.getElementById('gen-btn').onclick = async () => {
                    const btn = document.getElementById('gen-btn');
                    const status = document.getElementById('status-text');
                    const filterEl = document.getElementById('filter-selection');
                    const selectedVal = filterEl ? filterEl.value : 'ALL';

                    btn.disabled = true;
                    status.innerText = "Capturing System Configuration...";
                    document.getElementById('table-container').innerHTML = ''; 
                    document.getElementById('export-btn').style.display = 'none';

                    await ensureApiAndBranchList();

                    let savedBListStr = localStorage.getItem('microfin_branch_list');
                    let rawBranches = [];
                    if (savedBListStr && JSON.parse(savedBListStr).length > 0) {
                        let bList = JSON.parse(savedBListStr);
                        rawBranches = bList.map(o => {
                            let cleanId = (o.id === 'SELF' || o.id === '0' || o.id === '-1') ? '' : o.id;
                            return {
                                id: cleanId, 
                                name: o.name, 
                                area: maps.aMap[o.id] || o.area || 'Assigned Area', 
                                zone: maps.zMap[o.id] || o.zone || 'Assigned Zone'
                            };
                        });
                    } else {
                        rawBranches = [{ id: '', name: "My Branch", area: 'Branch', zone: 'Branch' }];
                    }

                    if(selectedVal !== 'ALL') {
                        if(maps.role === 'HO') rawBranches = rawBranches.filter(b => b.zone === selectedVal);
                        else if(maps.role === 'ZONE') rawBranches = rawBranches.filter(b => b.area === selectedVal);
                    }

                    let currentReportStructure = { 
                        maps: maps, 
                        rawBranches: rawBranches, 
                        fetchedCounts: {}
                    };

                    for (let b of rawBranches) {
                        status.innerText = `Processing: ${b.name}`;
                        let active = await fetchMemberCount(b.id, '');
                        let verified = await fetchMemberCount(b.id, '1');
                        currentReportStructure.fetchedCounts[b.id] = { active: active, verified: verified };
                    }

                    renderTable(currentReportStructure);
                    
                    status.innerText = "✅ Report Generated Successfully!";
                    document.getElementById('export-btn').style.display = 'block';
                    btn.disabled = false;
                };

                document.getElementById('export-btn').onclick = () => {
                    let table = document.getElementById('reportTable');
                    let blob = new Blob([`<html><head><meta charset="UTF-8"></head><body>${table.outerHTML}</body></html>`], {type: 'application/vnd.ms-excel'});
                    let a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    let filterEl = document.getElementById('filter-selection');
                    let fileName = filterEl && filterEl.value !== 'ALL' ? filterEl.value : 'All_Branches';
                    let dateSuffix = new Date().toISOString().split('T')[0];
                    a.download = `Hierarchical_Report_${fileName}_${dateSuffix}.xls`;
                    a.click();
                };
            }
        } catch (e) {
            console.error("UI Injection Error: ", e);
        }
    }

    // ৬. অটো স্টার্টার (শুধুমাত্র হোমপেজ / ড্যাশবোর্ড)
    let hasSyncedThisPageLoad = false;

    setInterval(() => {
        if (window !== window.top) return;
        let isOnDashboard = window.location.hash.includes('dashboard');

        if (isOnDashboard) {
            if (!hasSyncedThisPageLoad) {
                hasSyncedThisPageLoad = true;
                if (localStorage.getItem('microfin_sync_status') !== 'DONE') {
                    performZeroTouchSync();
                }
            } 
            
            if (!document.getElementById('auto-report-panel') && !document.getElementById('member-report-toggle-btn') && !isToggleClosed) {
                try {
                    injectToggleBtn(); // Floating pill button on Dashboard immediately
                } catch(e) {
                    console.error("Failed to inject UI: ", e);
                }
            }
        } else {
            hasSyncedThisPageLoad = false;
            isToggleClosed = false; 
            let panel = document.getElementById('auto-report-panel');
            if (panel) panel.remove();
            let toggleBtn = document.getElementById('member-report-toggle-btn');
            if (toggleBtn) toggleBtn.remove();
        }
    }, 1000);

})();
