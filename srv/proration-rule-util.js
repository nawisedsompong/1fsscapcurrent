const cds = require('@sap/cds');

async function ProrationRule(data, req, logRequired, claimData) {
	let tx = cds.transaction(req);
	let logs = [], value = 0;
	// Logic for hire and exit date
	try {
		let employeeDetails = await tx.run(`SELECT * FROM "SF_EMPEMPLOYMENT" WHERE "USERID"='${data.UserID}'`);
		if (employeeDetails.length <= 0) {
			throw new Error('Employee data not found');
			return;
		}
		employeeDetails = employeeDetails[0];
		let ClaimDetail = data.ClaimDetail;
		
		if (employeeDetails.STARTDATE == null) {
			employeeDetails.STARTDATE = dateFormat(new Date(new Date(ClaimDetail.Date).getFullYear(), 0, 01));
		}
		
		if (employeeDetails.ENDDATE == null) {
			employeeDetails.ENDDATE = '9999-12-31 00:00:00'
		}
		ClaimDetail.yearEnd = dateFormat(new Date(new Date(ClaimDetail.Date).getFullYear(), 11, 31));
		ClaimDetail.yearStart = dateFormat(new Date(new Date(ClaimDetail.Date).getFullYear(), 0, 01));
		
		let empJobQuery =
			`SELECT "EMPJOB1".*
			 FROM "SF_EMPJOB" AS "EMPJOB1"
			 INNER JOIN (SELECT DISTINCT "STARTDATE", MAX(CAST("SEQNUMBER" AS INT)) AS "SEQNUMBER" FROM "SF_EMPJOB" WHERE "USERID" = '${data.UserID}' GROUP BY "STARTDATE") AS "EMPJOB2"
			 ON "EMPJOB1"."STARTDATE" = "EMPJOB2"."STARTDATE" AND "EMPJOB1"."SEQNUMBER" = "EMPJOB2"."SEQNUMBER"
			 WHERE "EMPJOB1"."USERID" = '${data.UserID}' AND
			 "EMPJOB1"."STARTDATE" >= '${employeeDetails.STARTDATE}' AND "EMPJOB1"."ENDDATE" <= '${employeeDetails.ENDDATE}' AND
			 (YEAR("EMPJOB1"."STARTDATE") <=  YEAR('${ClaimDetail.yearEnd}') AND (YEAR("EMPJOB1"."ENDDATE") >= YEAR('${ClaimDetail.yearStart}')))
			 ORDER BY "EMPJOB2"."SEQNUMBER" DESC
			`;
		const resEmpJob = await tx.run(empJobQuery);
		if (resEmpJob.length <= 0) {
			throw new Error('Employee data not found');
			return;
		}
		
		// check if the employee is hired or contractor.
		let Benefit_Entitlement = await tx.run(`SELECT * FROM "BENEFIT_BENEFIT_ENTITLEMENT_ADJUST"
			WHERE EMP_ID='${data.UserID}' AND CLAIM_CODE='${ClaimDetail.Claim_Code}' AND YEAR='${new Date(ClaimDetail.Date).getFullYear().toString()}'`);
		let GV_BenefitAdjust = 0;
		if (Benefit_Entitlement.length > 0) {
			Benefit_Entitlement = Benefit_Entitlement[0];
			GV_BenefitAdjust = parseFloat(Benefit_Entitlement.ADJUSTMENT);
		}
		var claimAdmin = await tx.run(`SELECT * FROM "BENEFIT_BENEFIT_CLAIM_ADMIN"
			WHERE CLAIM_CODE='${ClaimDetail.Claim_Code}' AND CLAIM_CATEGORY='${ClaimDetail.Claim_Category}' AND START_DATE<='${dateFormat(ClaimDetail.Date)}' AND END_DATE>='${dateFormat(ClaimDetail.Date)}'`);
		if (claimAdmin.length > 0) {
			claimAdmin = claimAdmin[0];
		} else {
			throw new Error('Claim info not found');
			return;
		}
		let entitlementRounding = claimAdmin.ENTITLEMENT_ROUNDING;
		
		const partTime = ['CP', 'PP', 'PT'];
		const halfDayNPLCodes = ['1176', '1215', '1216', '1217'];
		let finalProratedWork = 0, nplTotalDays = 0;
		let fdate = new Date(new Date(ClaimDetail.Date).getFullYear(), 0, 1);
		let ldate = new Date(new Date(ClaimDetail.Date).getFullYear(), 11, 31);
		let nplQuery = `SELECT *
		 FROM "SF_EMPLOYEETIME"
		 WHERE 
		    "USERID" = '${data.UserID}' AND
		    "APPROVALSTATUS"  = 'APPROVED' AND
		    "TIMETYPE" IN ('1173', '1176', '1211', '1212', '1213', '1214', '1215', '1216', '1217', '1401') AND
			(YEAR("STARTDATE") <=  YEAR('${ClaimDetail.yearEnd}') AND YEAR("ENDDATE") >= YEAR('${ClaimDetail.yearStart}'))`;
		let nplData = await tx.run(nplQuery);
		for (let j = 0; j < nplData.length; j++) {
			if (nplData[j].STARTDATE && nplData[j].ENDDATE) {
				let startDate = new Date(nplData[j].STARTDATE);
				let endDate = new Date(nplData[j].ENDDATE);
				if (startDate <= fdate) {
					startDate = fdate;
				}
				if (endDate >= ldate) {
					endDate = ldate;
				}
				if ((startDate >= fdate && startDate <= ldate) && (endDate >= fdate && endDate <= ldate) && startDate <= endDate) {
					if (halfDayNPLCodes.includes(nplData[j].TIMETYPE)) {
						nplTotalDays += (differenceBetweenDays(startDate, endDate) / 2);
					} else {
						nplTotalDays += differenceBetweenDays(startDate, endDate);
					}
				}
			}
		}
		
		for (let i = 0; i < resEmpJob.length; i++) {
			let isPermanent = true;
			if (partTime.includes(resEmpJob[i].EMPLOYEETYPE)) {
				isPermanent = false;
			}
			let nplQuantityInDays = 0;
			let empStartDate = new Date(resEmpJob[i].STARTDATE), empEndDate = new Date(resEmpJob[i].ENDDATE);
			for (let k = 0; k < nplData.length; k++) {
				if (nplData[k].STARTDATE && nplData[k].ENDDATE) {
					let nplStartDate = new Date(nplData[k].STARTDATE);
					let nplEndDate = new Date(nplData[k].ENDDATE);
					if (nplStartDate < empStartDate && nplEndDate > empEndDate) { //Outside employment period
						nplStartDate = empStartDate;
						nplEndDate = empEndDate;
					} else if (nplStartDate < empStartDate && nplEndDate <= empEndDate) { // Start date outside employment period
						nplStartDate = empStartDate;
					} else if (nplStartDate >= empStartDate && nplEndDate > empEndDate) { // End date outside employment period
						nplEndDate = empEndDate;
					}
					if (nplStartDate <= fdate) {
						nplStartDate = fdate;
					}
					if (nplEndDate >= ldate) {
						nplEndDate = ldate;
					}
					if ((nplStartDate >= fdate && nplStartDate <= ldate) && (nplEndDate >= fdate && nplEndDate <= ldate) && nplStartDate <= nplEndDate) {
						if (halfDayNPLCodes.includes(nplData[k].TIMETYPE)) {
							nplQuantityInDays += (differenceBetweenDays(nplStartDate, nplEndDate) / 2);
						} else {
							nplQuantityInDays += differenceBetweenDays(nplStartDate, nplEndDate);
						}
					}
				}
			}
			let work = 0;
			if (isPermanent) {
				work = regularEmpCalculation(claimAdmin, resEmpJob[i], nplQuantityInDays, nplTotalDays);
			} else {
				let FOLocation = await tx.run(`SELECT * FROM "SF_V_FOLOCATION" WHERE EXTERNALCODE='${resEmpJob[i].LOCATION}'`);
				if (FOLocation.length > 0) {
					work = partTimeCalculation(FOLocation[0], claimAdmin, resEmpJob[i], nplQuantityInDays, nplTotalDays);
				} else {
					throw new Error('Employee data not found');
					return;
				}
			}

			// Multiplied Base Entitlement to calculated work
			work = work * data.Entitlement;
			// Adding up in final work done
			finalProratedWork += work; 
		}
		
		// Rounding Rule applied on work done
		if (entitlementRounding.includes('Round down Nearest Dollar')) {
			finalProratedWork = parseFloat(finalProratedWork).toFixed(2);
			finalProratedWork = Math.floor(finalProratedWork);
		} else if (entitlementRounding.includes('Round Up Nearest Dollar')) {
			finalProratedWork = parseFloat(finalProratedWork).toFixed(2);
			finalProratedWork = Math.ceil(finalProratedWork);
		} else {
			finalProratedWork = parseFloat(parseFloat(finalProratedWork).toFixed(2));
		}
		if (parseFloat(finalProratedWork) > parseFloat(data.Entitlement)) {
			finalProratedWork = data.Entitlement;
		}
		// Adding GV Entitlement adjustment in final prorated work
		finalProratedWork = finalProratedWork + GV_BenefitAdjust
		
		if (logRequired) {
			return {
				value: finalProratedWork,
				logs: logs,
				error: false
			};
		} else {
			return {
				value: finalProratedWork,
				error: false
			};
		}
	} catch (err) {
		console.log(err);
		if (logRequired) {
			logs.push({
				Rep_Log_ID: generateRandomID(),
				Rep_Timestamp: new Date(),
				Internal_Claim_Reference: claimData.CLAIM_REFERENCE,
				Rep_Type: 'SF Replication',
				Rep_Status: 'Error',
				Message: err.message,
				Employee_ID: data.UserID,
				Claim_Ref_Number: claimData.CLAIM_REFERENCE,
				Effective_Date: new Date(),
				Pay_Component: null,
				Claim_Amount: null
			});
			return  {
				value: 0,
				logs: logs,
				error: true
			};
		} else {
			return req.reject({
				code: '422',
				message: `Proration error. Please contact HR if your entitlement is incorrect`
			});
		}
	}
}

function regularEmpCalculation(claimAdmin, employeeDetails, nplQuantityInDays, nplTotalDays) {
	let ldate = new Date(new Date(claimAdmin.START_DATE).getFullYear(), 11, 31);
	let fdate = new Date(new Date(claimAdmin.START_DATE).getFullYear(), 0, 1);
	/*if (new Date(employeeDetails.STARTDATE) <= fdate && new Date(employeeDetails.ENDDATE) >= ldate) {
		return parseFloat(1);
	}*/
	if (new Date(employeeDetails.STARTDATE) <= fdate) {
		employeeDetails.STARTDATE = fdate;
	}
	if (new Date(employeeDetails.ENDDATE) >= ldate) {
		employeeDetails.ENDDATE = ldate;
	}
	let difference = differenceBetweenDays(new Date(employeeDetails.STARTDATE), new Date(employeeDetails.ENDDATE));
	
	if (nplTotalDays && parseFloat(nplTotalDays) > 30 && nplQuantityInDays && parseFloat(nplQuantityInDays) > 0) {
		difference = difference - parseFloat(nplQuantityInDays);
	}
	
	let work = 0;
	switch (claimAdmin.PROBATION_TYPE) {
	case 'Days':
		work = difference / 365;
		break;
	case 'Week':
		work = Math.round(difference / 7);
		work = work / 52;
		break;
	case 'Month':
		work = Math.round(difference / 30);
		work = work / 12;
		break;
	}
	return work;
};

function partTimeCalculation(FOLocation, claimAdmin, employeeDetails, nplQuantityInDays, nplTotalDays) {
	// FOLocation = FOLocation[0];
	let ldate = new Date(new Date(claimAdmin.START_DATE).getFullYear(), 11, 31);
	let fdate = new Date(new Date(claimAdmin.START_DATE).getFullYear(), 0, 1);
	
	let work = 0;
	if (new Date(employeeDetails.STARTDATE) <= fdate) {
		employeeDetails.STARTDATE = fdate;
	}
	if (new Date(employeeDetails.ENDDATE) >= ldate) {
		employeeDetails.ENDDATE = ldate;
	}
	let difference = differenceBetweenDays(new Date(employeeDetails.STARTDATE), new Date(employeeDetails.ENDDATE));
	
	if (nplTotalDays && parseFloat(nplTotalDays) > 30 && nplQuantityInDays && parseFloat(nplQuantityInDays) > 0) {
		difference = difference - parseFloat(nplQuantityInDays);
	}
	
	work = (difference * (employeeDetails.STANDARDHOURS / FOLocation.STANDARDHOURS));
	
	switch (claimAdmin.PROBATION_TYPE) {
	case 'Days':
		work = work / 365;
		break;
	case 'Week':
		work = Math.round(work / 7);
		work = work / 52;
		break;
	case 'Month':
		work = Math.round(work / 30);
		work = work / 12;
		break;
	}

	return work;
};

function differenceBetweenDays(date1, date2) {
	// const date1 = new Date('7/13/2010');
	// const date2 = new Date('12/15/2010');
	date2.setMilliseconds(date2.getMilliseconds() + 1); // added this code on 29/09 to consider end date also without this sdate (01/01) edate 22/02 --> difference is coming as 21 
	const diffTime = Math.abs(date2 - date1);
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	return diffDays;
};

function dateFormat(pdate) {
	var ldate = new Date(pdate)
	var date = ldate.getDate();
	var month = ldate.getMonth();
	var year = ldate.getFullYear();
	var ddmmyyyy = year + "-" + pad(month + 1) + "-" + pad(date);
	return ddmmyyyy;
};

function pad(n) {
	return n < 10 ? '0' + n : n
};

function generateRandomID() {
		return Math.floor(Math.random() * 9000000000) + 1000000000;
};

module.exports = ProrationRule;