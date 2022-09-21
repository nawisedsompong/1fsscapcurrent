const {
	parentPort
} = require("worker_threads");
const cds = require('@sap/cds');
const prorationRule = require('../proration-rule-util');

parentPort.on("message", async data => {
	
	
	// var returnArray= {
	// 		value: ""
	// 	}
	if (data.action=="Prorate"){
		var finalValue=	await medicalClaimYTDReport(data.req)
		var returnArray= {
			value: finalValue
		}
	}
	else{
		// var finalValue=	await YTDOtherReport(data.req)
		//  var returnArray= {
		// 	value: finalValue
		// }
		 var finalValue = await medicalSubRoutine(data.req,data.USERID,data.finalValues,data.claimcodeListValues,data.employeevaluesid)
		 var returnArray= {
			value: finalValue
		}
		
	}
	parentPort.postMessage(returnArray);
})

function reportEmployeeExtract(req) {
	var arrayOfUser = req.data.USER_ID;
	var userid = [];
	for (var index in arrayOfUser) {
		if (arrayOfUser[index].EMPLOYEE != '') {
			userid.push(arrayOfUser[index].EMPLOYEE);
		}
	}
	return userid
};

function parseFloat2Decimals(value) {
		//Sahas Round Off issue
		// return parseFloat(parseFloat(value).toFixed(2));
		return parseFloat((Math.round(value * 100) / 100).toFixed(2))
			//End Sahas Round Off issue
	};
	
async function YTDOtherReport(req) {
	console.log("Success")
	var userid = reportEmployeeExtract(req).length != 0 ? JSON.stringify(reportEmployeeExtract(req)) : '';
	
	var PERSONAL_AREA_IN = req.data.PERSONAL_AREA_IN;
	var PERSONAL_SUB_AREA = req.data.PERSONAL_SUB_AREA;
	var PAY_GRADE = req.data.PAY_GRADE;
	var DIVISION = req.data.DIVISION;
	var CLAIM_YEAR = req.data.CLAIM_YEAR;
	// var tx = cds.tx({ user:'u2' })
	// var tx = cds.transaction(req);
	var db = await cds.connect.to('db')
	var tx = db.tx()
	var vCalculation =
		`SELECT * FROM "CALCULATION_GET_TAKEN_PENDING_ALL"
	(placeholder."$$USER_ID$$"=>'',placeholder."$$CLAIM_YEAR$$"=>'${CLAIM_YEAR}')
	WHERE PERSONAL_AREA = '${PERSONAL_AREA_IN}' and PERSONAL_SUB_AREA ='${PERSONAL_SUB_AREA}' and PAY_GRADE='${PAY_GRADE}' and DIVISION='${DIVISION}' 
	AND (CLAIM_CODE_VALUE != 'DEN' AND CLAIM_CODE_VALUE != 'DEN_EFMR' AND CLAIM_CODE_VALUE != 'HOSPD'
	AND CLAIM_CODE_VALUE != 'HOSPS' AND CLAIM_CODE_VALUE != 'HOSPS_EFMR' AND CLAIM_CODE_VALUE != 'OPTD'
	AND CLAIM_CODE_VALUE !='OPTS' AND CLAIM_CODE_VALUE !='OPTS_EFMR' AND CLAIM_CODE_VALUE !='SPTD' 
	AND CLAIM_CODE_VALUE !='SPTS' AND CLAIM_CODE_VALUE !='HOSPD_DAY' AND CLAIM_CODE_VALUE !='HOSPS_DAY' 
	AND CLAIM_CODE_VALUE !='PTF' AND CLAIM_CODE_VALUE !='TrvIntExamSpons' AND CLAIM_CODE_VALUE !='TrvHMDSpons2' AND CLAIM_CODE_VALUE !='TrvHMDSpons1' 
	AND CLAIM_CODE_VALUE !='TrvExitExamSpons' ) `

	if (userid != "" && userid != null && userid != undefined) {
		if (Array.isArray(JSON.parse(userid))) {
			var removeArray = userid.replace("[", "(").replace("]", ")").replace(/"/g, "'")
			var filteradd =
				`and "EMPLOYEE" IN ${removeArray}`;
		} else {
			var filteradd = `and EMPLOYEE='${userid}'`
		}
	} else {
		var filteradd = ``
	}

	vCalculation = vCalculation + filteradd;
	var oEmployeeData = await tx.run(vCalculation);
	console.log("Success Two")
	return oEmployeeData
}
async function medicalClaimYTDReport(req) {
	// var userid = req.data.USER_ID;
	var db = await cds.connect.to('db')
	var tx = db.tx()
	var userid = reportEmployeeExtract(req).length != 0 ? JSON.stringify(reportEmployeeExtract(req)) : '';
	var PERSONAL_AREA_IN = req.data.PERSONAL_AREA_IN;
	var PERSONAL_SUB_AREA = req.data.PERSONAL_SUB_AREA;
	var PAY_GRADE = req.data.PAY_GRADE;
	var DIVISION = req.data.DIVISION;
	var CLAIM_YEAR = req.data.CLAIM_YEAR;

	var CURRENT_DATE = '01-01-' + CLAIM_YEAR;
	var COMPANY = req.data.PERSONAL_AREA_IN;

	let currentYear = CLAIM_YEAR;
	let first_date = [currentYear, '01', '01'].join('-');
	let last_date = [currentYear, 12, 31].join('-');

	var finalValues = [];
	var medicalClaim =
		`SELECT * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY ='MOHH' AND ("CATEGORY_CODE" = 'MC' OR  "CLAIM_CODE" = 'PTF' or "CATEGORY_CODE" = 'SP' OR
									"CATEGORY_CODE" = 'SP1' OR "CATEGORY_CODE" = 'SP2' OR "CATEGORY_CODE" = 'SP3' OR "CATEGORY_CODE" = 'SDFC' OR "CATEGORY_CODE" = 'SDFR'
                                    OR "CATEGORY_CODE" = 'CPC' OR "CATEGORY_CODE" = 'OC' OR "CATEGORY_CODE" = 'PAY_UP')`
	var claimcodeListValues = await tx.run(medicalClaim);
	var employeeList =
		`SELECT * FROM "SF_EMPLOYEEINFORMATIONALL" 
									WHERE PERSONAL_AREA = '${PERSONAL_AREA_IN}' and PERSONAL_SUB_AREA ='${PERSONAL_SUB_AREA}' 
									and PAYGRADE='${PAY_GRADE}' and DIVISION='${DIVISION}'`

	if (userid != "" && userid != null && userid != undefined) {
		if (Array.isArray(JSON.parse(userid))) {
			var removeArray = userid.replace("[", "(").replace("]", ")").replace(/"/g, "'")
			var filteradd =
				`and "PERSONIDEXTERNAL" IN ${removeArray}`;
		} else {
			var filteradd = `and PERSONIDEXTERNAL='${userid}'`
		}
	} else {
		var filteradd = ``
	}
	employeeList = employeeList + filteradd;
	var employeevalues = await tx.run(employeeList);
	// let claimcodeListValues = await tx.run(claimcodeList);
	for (var empid = 0; empid < employeevalues.length; empid++) {
		var USERID = employeevalues[empid].PERSONIDEXTERNAL;
		for (var index = 0; index < claimcodeListValues.length; index++) {

			// let entitlementFind =
			// 	`
			// SELECT TOP 1 * FROM "GET_DRAFT_CDS"('${USERID}')
			//         WHERE "CLAIM_CODE"='${claimcodeListValues[index].CLAIM_CODE}'`;

			// let eligibilitySQL =
			let entitlementFind =
				`SELECT  "CLAIM_CODE",
				                  "SEQUENCE",
				                  "EFFECTIVE_DATE",
				                  "END_DATE",
				                  "ENTITLEMENT",
				                  "CATEGORY_CODE",
				                  "CATEGORY_DESC"
				            FROM "SF_EMPLOYEEELIGIBILITY"('${USERID}')
				                WHERE  "CLAIM_CODE" = '${claimcodeListValues[index].CLAIM_CODE}'  AND
				                        "EFFECTIVE_DATE" >= '1900-01-01' AND
				                        "END_DATE" <= '9999-12-31'`;

			entitlementFindList = await tx.run(entitlementFind);

			if (entitlementFindList.length != 0) {
				var Entitlement = entitlementFindList[0].ENTITLEMENT;
			} else {
				var Entitlement = "0.00"
			}

			var data = {
				employeeId: USERID,
				Claim_Code: claimcodeListValues[index].CLAIM_CODE,
				entitlement: Entitlement,
				taken: "0.00",
				pending: "0.00",
				YTDConsultation: "0.00",
				YTDOthers: "0.00",
				YTDWardCharges: "0.00",
				balance: "0.00",
				claimDate: CURRENT_DATE,
				totalWardDays: 0,
				consumedWardDays: 0,
				remainingWardDays: 0,
				pendingWardDays: 0,
				claimAmountWWPending: "0.00",
				claimAmountWW: "0.00",
				company: COMPANY
			}
			if (data.entitlement != 0) {
				let prorationPayload = {
					UserID: data.employeeId,
					Entitlement: data.entitlement,
					EmpType: "",
					WorkingPeriod: "",
					ClaimDetail: {
						Date: new Date(data.claimDate),
						Company: data.company,
						Claim_Code: data.Claim_Code,
						Claim_Category: claimcodeListValues[index].CATEGORY_CODE
					}
				};
				let prorationResult = await prorationRule(prorationPayload, req, true, {
					CLAIM_REFERENCE: ''
				});
				data.entitlement = parseInt(prorationResult.value) === 0 ? data.entitlement : parseInt(prorationResult.value);
				// data.remainingWardDays = data.totalWardDays - data.consumedWardDays - data.pendingWardDays;
			} else {
				data.totalWardDays = 0;
				data.remainingWardDays = 0;
			}
			if (claimcodeListValues[index].CATEGORY_CODE == 'MC') {
				var approvedMedicalClaimQuery =
					`SELECT "EMPLOYEE_ID",
				            "CLAIM_AMOUNT", 
				            "CLAIM_CONSULTATION_FEE",
				            "CLAIM_OTHER_COST",
				            "NO_OF_WARD_DAYS",
				            "WARD_CHARGES",
				            "CLAIM_AMOUNT_WW",
				            "HOSPITALIZATION_FEES"
				            FROM "BENEFIT_MEDICAL_CLAIM"
				        WHERE "EMPLOYEE_ID"=${data.employeeId} AND
				        	"CLAIM_STATUS"='Approved' AND `;

				var pendingMedicalClaimQuery =
					`
				SELECT "EMPLOYEE_ID",
				            "CLAIM_AMOUNT", 
				            "CLAIM_CONSULTATION_FEE",
				            "CLAIM_OTHER_COST",
				            "NO_OF_WARD_DAYS",
				            "WARD_CHARGES",
				            "CLAIM_AMOUNT_WW",
				            "HOSPITALIZATION_FEES"
				        FROM "BENEFIT_MEDICAL_CLAIM" 
				        WHERE "EMPLOYEE_ID"=${data.employeeId} AND 
				        	"CLAIM_STATUS" LIKE 'Pending for approval%' AND `;
			} else {
				if (claimcodeListValues[index].CLAIM_CODE == 'PTF') {
					var mainTable = 'BENEFIT_PTF_ACL_BCL_CLAIM'
				} else if (claimcodeListValues[index].CATEGORY_CODE == 'SP') {
					var mainTable = 'BENEFIT_SP_MASTER_CLAIM'
				} else if (claimcodeListValues[index].CATEGORY_CODE == 'SP1') {
					var mainTable = 'BENEFIT_SP1_MASTER_CLAIM'
				} else if (claimcodeListValues[index].CATEGORY_CODE == 'SP2') {
					var mainTable = 'BENEFIT_SP2_MASTER_CLAIM'
				} else if (claimcodeListValues[index].CATEGORY_CODE == 'SP3') {
					var mainTable = 'BENEFIT_SP3_MASTER_CLAIM'
				}
				var approvedMedicalClaimQuery =
					` SELECT "EMPLOYEE_ID" ,
			    							'${claimcodeListValues[index].CLAIM_CODE}' AS "CLAIM_CODE" ,
			    							"CLAIM_REFERENCE",
			    							"CLAIM_DATE" ,
			    							"CLAIM_CATEGORY",
			    							"CLAIM_AMOUNT",
			    							"SUBMITTED_BY",
			    							"CATEGORY_CODE",
			    							"BEHALF_FLAG",
			    							"CLAIM_STATUS",
			    							'0.00' as "CONSULTATION_FEE",
			    							'0.00' as "OTHER_COST",
			    							'0.00' as "WARD_CHARGES",
    										'0.00' as "HOSPITALIZATION_FEES",
    										'0.00' as "CLAIM_AMOUNT_WW",
    										'0.0' as"NO_OF_WARD_DAYS"
									FROM "${mainTable}" 
				        WHERE "EMPLOYEE_ID"=${data.employeeId} AND
				        	"CLAIM_STATUS"='Approved' AND `;

				var pendingMedicalClaimQuery =
					`SELECT "EMPLOYEE_ID" ,
			    							'${claimcodeListValues[index].CLAIM_CODE}' AS "CLAIM_CODE",
			    							"CLAIM_REFERENCE",
			    							"CLAIM_DATE" ,
			    							"CLAIM_CATEGORY",
			    							"CLAIM_AMOUNT",
			    							"SUBMITTED_BY",
			    							"CATEGORY_CODE",
			    							"BEHALF_FLAG",
			    							"CLAIM_STATUS",
			    							'0.00' as "CONSULTATION_FEE",
			    							'0.00' as "OTHER_COST",
			    							'0.00' as "WARD_CHARGES",
    										'0.00' as "HOSPITALIZATION_FEES",
    										'0.00' as "CLAIM_AMOUNT_WW",
    										'0.0' as"NO_OF_WARD_DAYS"
									FROM "${mainTable}" 
				        WHERE "EMPLOYEE_ID"=${data.employeeId} AND 
				        	"CLAIM_STATUS" LIKE 'Pending for approval%' AND `;
			}
			// let approvedMedicalClaimQuery =
			// 	`
			// SELECT * FROM "GET_DRAFT_CDS"('${USERID}')
			//         WHERE "CLAIM_STATUS"='Approved' AND `;

			// let pendingMedicalClaimQuery =
			// 	`
			// SELECT * FROM "GET_DRAFT_CDS"('${USERID}')
			//         WHERE "CLAIM_STATUS" LIKE 'Pending for approval%' AND `;

			let querySubString = '';
			if (claimcodeListValues[index].CLAIM_CODE === 'OPTS') {
				querySubString = `"CLAIM_CODE" IN ('OPTS', 'OPTD') AND "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'`;
			} else if (claimcodeListValues[index].CLAIM_CODE === "OPTD") {
				querySubString = `"CLAIM_CODE" IN ('OPTD') AND "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'`;
			} else if (claimcodeListValues[index].CATEGORY_CODE === "SP" || claimcodeListValues[index].CATEGORY_CODE === "SP1" ||
				claimcodeListValues[index].CATEGORY_CODE === "SP2" || claimcodeListValues[index].CATEGORY_CODE === "SP3") {
				querySubString = `"CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'`;
			} else {
				querySubString =
					`"CLAIM_CODE"='${claimcodeListValues[index].CLAIM_CODE}' AND "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'`;
			}

			approvedMedicalClaimQuery += querySubString;
			pendingMedicalClaimQuery += querySubString;
			let approvedClaims = await tx.run(approvedMedicalClaimQuery);
			let pendingClaims = await tx.run(pendingMedicalClaimQuery);

			if (approvedClaims.length === 0) {
				data.YTDConsultation = 0;
				data.YTDOthers = 0;
				data.YTDWardCharges = 0;
				data.taken = 0;
				data.balance = parseFloat(data.entitlement);
				data.claimAmountWW = 0;
				data.consumedWardDays = 0;
				data.YTDHospitalFee = 0;
			}
			if (!data.YTDWardCharges) {
				data.YTDWardCharges = 0;
			}

			for (let i = 0; i < approvedClaims.length; i++) {
				// Sanitized values
				approvedClaims[i].CLAIM_AMOUNT = (approvedClaims[i].CLAIM_AMOUNT) ? parseFloat(approvedClaims[i].CLAIM_AMOUNT) : 0;
				approvedClaims[i].CLAIM_CONSULTATION_FEE = (approvedClaims[i].CLAIM_CONSULTATION_FEE) ? parseFloat(approvedClaims[i].CLAIM_CONSULTATION_FEE) :
					0;
				approvedClaims[i].CLAIM_OTHER_COST = (approvedClaims[i].CLAIM_OTHER_COST) ? parseFloat(approvedClaims[i].CLAIM_OTHER_COST) : 0;
				approvedClaims[i].NO_OF_WARD_DAYS = (approvedClaims[i].NO_OF_WARD_DAYS) ? parseFloat(approvedClaims[i].NO_OF_WARD_DAYS) : 0;
				approvedClaims[i].CLAIM_AMOUNT_WW = (approvedClaims[i].CLAIM_AMOUNT_WW) ? parseFloat(approvedClaims[i].CLAIM_AMOUNT_WW) : 0;
				approvedClaims[i].HOSPITALIZATION_FEES = (approvedClaims[i].HOSPITALIZATION_FEES) ? parseFloat(approvedClaims[i].HOSPITALIZATION_FEES) :
					0;
				// Summation

				data.taken = parseFloat(data.taken) + parseFloat(approvedClaims[i].CLAIM_AMOUNT);
				data.consumedWardDays += parseFloat(approvedClaims[i].NO_OF_WARD_DAYS);
				data.claimAmountWW = parseFloat(data.claimAmountWW) + parseFloat(approvedClaims[i].CLAIM_AMOUNT_WW);
				// New logic for YTDConsultation and YTDOthers
				data.YTDConsultation = parseFloat(data.YTDConsultation) + parseFloat(approvedClaims[i].CLAIM_CONSULTATION_FEE);
				data.YTDOthers = parseFloat(data.YTDOthers) + parseFloat(approvedClaims[i].CLAIM_OTHER_COST);
				data.YTDHospitalFee = parseFloat(data.YTDHospitalFee) + parseFloat(approvedClaims[i].HOSPITALIZATION_FEES)
					// Old logic
					// // CLAIM_AMOUNT capping
					// let YTDConsultation = (approvedClaims[i].CONSULTATION_FEE > approvedClaims[i].CLAIM_AMOUNT) ? approvedClaims[i].CLAIM_AMOUNT :
					// 	approvedClaims[i].CONSULTATION_FEE;
					// data.YTDConsultation = parseFloat(data.YTDConsultation) + parseFloat(YTDConsultation);
					// // YTDOthers calculation
					// let YTDOthers = parseFloat(approvedClaims[i].CLAIM_AMOUNT) - parseFloat(approvedClaims[i].CONSULTATION_FEE);
					// data.YTDOthers = (YTDOthers > 0) ? parseFloat(data.YTDOthers) + parseFloat(YTDOthers) : data.YTDOthers;
					// YTDWardCharges calculation
				let YTDWardCharges = parseFloat(approvedClaims[i].CLAIM_AMOUNT) - parseFloat(approvedClaims[i].CLAIM_AMOUNT_WW);
				data.YTDWardCharges = parseFloat(data.YTDWardCharges) + parseFloat(YTDWardCharges);
			}
			data.taken = parseFloat2Decimals(data.taken);
			data.claimAmountWW = parseFloat2Decimals(data.claimAmountWW);
			data.YTDConsultation = parseFloat2Decimals(data.YTDConsultation);
			data.YTDOthers = parseFloat2Decimals(data.YTDOthers);
			data.YTDWardCharges = parseFloat2Decimals(data.YTDWardCharges);
			data.YTDHospitalFee = parseFloat2Decimals(data.YTDHospitalFee);

			if (pendingClaims.length === 0) {
				data.pending = 0;
				data.pendingWardDays = 0;
				data.claimAmountWWPending = 0;
			}
			for (let j = 0; j < pendingClaims.length; j++) {
				// Sanitized values
				pendingClaims[j].CLAIM_AMOUNT = (pendingClaims[j].CLAIM_AMOUNT) ? parseFloat(pendingClaims[j].CLAIM_AMOUNT) : 0;
				pendingClaims[j].NO_OF_WARD_DAYS = (pendingClaims[j].NO_OF_WARD_DAYS) ? parseFloat(pendingClaims[j].NO_OF_WARD_DAYS) : 0;
				pendingClaims[j].CLAIM_AMOUNT_WW = (pendingClaims[j].CLAIM_AMOUNT_WW) ? parseFloat(pendingClaims[j].CLAIM_AMOUNT_WW) : 0;

				// Summation
				data.pending = parseFloat(data.pending) + parseFloat(pendingClaims[j].CLAIM_AMOUNT);
				data.pendingWardDays += parseFloat(pendingClaims[j].NO_OF_WARD_DAYS);
				data.claimAmountWWPending = parseFloat(data.claimAmountWWPending) + parseFloat(pendingClaims[j].CLAIM_AMOUNT_WW);
			}
			data.pending = parseFloat2Decimals(data.pending);
			data.claimAmountWWPending = parseFloat2Decimals(data.claimAmountWWPending);

			if (data.claimAmountWWPending === 0 && data.claimAmountWW === 0) {
				data.balance = parseFloat2Decimals(parseFloat(data.entitlement) - parseFloat(data.taken) - parseFloat(data.pending));
			} else {
				data.balance = parseFloat2Decimals(parseFloat(data.entitlement) - parseFloat(data.claimAmountWW) - parseFloat(data.claimAmountWWPending));
				data.pending = parseFloat2Decimals(data.claimAmountWWPending);
				data.taken = parseFloat2Decimals(data.claimAmountWW);
			}

			if (data.Claim_Code === "OPTD") {
				let OPTSTaken = await tx.run(
					`SELECT EMPLOYEE_ID,
                        sum(CLAIM_AMOUNT) as CLAIM_AMOUNT
                        FROM "BENEFIT_MEDICAL_CLAIM"
                    WHERE "EMPLOYEE_ID"=${data.employeeId} AND
                        "CLAIM_CODE" IN ('OPTS')  AND
                        "CLAIM_STATUS"='Approved' AND
                        "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'
                    GROUP BY 
                        "EMPLOYEE_ID"`
				);

				let OPTSPending = await tx.run(
					`SELECT EMPLOYEE_ID,
                        sum(CLAIM_AMOUNT) as PENDING_AMOUNT
                        FROM "BENEFIT_MEDICAL_CLAIM"
                    WHERE "EMPLOYEE_ID"=${data.employeeId} AND
                        "CLAIM_CODE" IN ('OPTS') AND
                        "CLAIM_STATUS" LIKE 'Pending for approval%' AND
                        "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'
                    GROUP BY 
                        "EMPLOYEE_ID"`
				);

				OPTSTaken = (OPTSTaken.length > 0 && OPTSTaken[0].CLAIM_AMOUNT) ? parseFloat(OPTSTaken[0].CLAIM_AMOUNT) : 0;
				OPTSPending = (OPTSPending.length > 0 && OPTSPending[0].PENDING_AMOUNT) ? parseFloat(OPTSPending[0].PENDING_AMOUNT) : 0;

				let entitlement = parseFloat(data.entitlement);
				if ((entitlement - OPTSTaken - OPTSPending) < 0) {
					let OPTSOverflow = (OPTSTaken + OPTSPending) - entitlement;
					if (OPTSTaken > entitlement) {
						data.taken = parseFloat2Decimals(parseFloat(data.taken) + (OPTSTaken - entitlement));
						OPTSOverflow = OPTSOverflow - (OPTSTaken - entitlement);
					}
					data.pending = parseFloat2Decimals(parseFloat(data.pending) + OPTSOverflow);
				}
			}

			data.balance = parseFloat2Decimals(parseFloat(data.entitlement) - parseFloat(data.taken) - parseFloat(data.pending));
			//===========================================================
			//                  Ward days logic
			//===========================================================

			// let eligibilitySQL =
			// 	`SELECT  "CLAIM_CODE",
			//                   "SEQUENCE",
			//                   "EFFECTIVE_DATE",
			//                   "END_DATE",
			//                   "ENTITLEMENT",
			//                   "CATEGORY_CODE",
			//                   "CATEGORY_DESC"
			//             FROM "SF_EMPLOYEEELIGIBILITY"('${data.employeeId}')
			//                 WHERE  "CLAIM_CODE" = 'HOSPS_Day'  AND
			//                         "EFFECTIVE_DATE" >= '1900-01-01' AND
			//                         "END_DATE" <= '9999-12-31'`;

			// let eligibilityData = await tx.run(eligibilitySQL);
			// if (entitlementFindList.length > 0 && data.Claim_Code == 'HOSPS_DAY') {
			// 	let prorationPayload = {
			// 		UserID: data.employeeId,
			// 		Entitlement: entitlementFindList[0].ENTITLEMENT,
			// 		EmpType: "",
			// 		WorkingPeriod: "",
			// 		ClaimDetail: {
			// 			Date: new Date(data.claimDate),
			// 			Company: data.company,
			// 			Claim_Code: data.Claim_Code,
			// 			Claim_Category: entitlementFindList[0].CATEGORY_CODE
			// 		}
			// 	};
			// 	let prorationResult = await prorationRule(prorationPayload, req, false);
			// 	data.totalWardDays = parseInt(prorationResult.value);
			// 	data.remainingWardDays = data.totalWardDays - data.consumedWardDays - data.pendingWardDays;
			// } else {
			// 	data.totalWardDays = 0;
			// 	data.remainingWardDays = 0;
			// }

			finalValues.push({
				EMPLOYEE: data.employeeId,
				CLAIM_CODE_VALUE: data.Claim_Code,
				DESCRIPTION: claimcodeListValues[index].DESCRIPTION,
				YEAR: CLAIM_YEAR,
				YTD_OTHER: data.YTDOthers,
				YTD_CONSULT: data.YTDConsultation,
				YTD_WARD_CHARGE: data.YTDWardCharges,
				YTD_HOSPITAL_FEE: data.YTDHospitalFee,
				PENDING_AMOUNT: data.pending,
				TAKEN_AMOUNT: data.taken,
				BALANCE: data.balance,
				ENTITLEMENT: data.entitlement,
				PAY_GRADE: employeevalues[empid].PAYGRADE,
				PERSONAL_AREA: employeevalues[empid].PERSONAL_AREA,
				PERSONAL_SUB_AREA: employeevalues[empid].PERSONAL_SUB_AREA,
				DEPARMENT: employeevalues[empid].DEPARTMENT,
				DIVISION: employeevalues[empid].DIVISION
			});
		}
	}
	return finalValues;
}

async function medicalSubRoutine(req,USERID,finalValues,claimcodeListValues,employeevaluesid){
	var db = await cds.connect.to('db')
	var tx = db.tx()
	var USERID = employeevaluesid.PERSONIDEXTERNAL;
	var PERSONAL_AREA_IN = req.data.PERSONAL_AREA_IN;
		var PERSONAL_SUB_AREA = req.data.PERSONAL_SUB_AREA;
		var PAY_GRADE = req.data.PAY_GRADE;
		var DIVISION = req.data.DIVISION;
		var CLAIM_YEAR = req.data.CLAIM_YEAR;

		var CURRENT_DATE = '01-01-' + CLAIM_YEAR;
		var COMPANY = req.data.PERSONAL_AREA_IN;

		let currentYear = CLAIM_YEAR;
		let first_date = [currentYear, '01', '01'].join('-');
		let last_date = [currentYear, 12, 31].join('-');
	for (var index = 0; index < claimcodeListValues.length; index++) {

			// let entitlementFind =
			// 	`
			// SELECT TOP 1 * FROM "GET_DRAFT_CDS"('${USERID}')
			//         WHERE "CLAIM_CODE"='${claimcodeListValues[index].CLAIM_CODE}'`;

			// let eligibilitySQL =
			let entitlementFind =
				`SELECT  "CLAIM_CODE",
				                  "SEQUENCE",
				                  "EFFECTIVE_DATE",
				                  "END_DATE",
				                  "ENTITLEMENT",
				                  "CATEGORY_CODE",
				                  "CATEGORY_DESC"
				            FROM "SF_EMPLOYEEELIGIBILITY"('${USERID}')
				                WHERE  "CLAIM_CODE" = '${claimcodeListValues[index].CLAIM_CODE}'  AND
				                        "EFFECTIVE_DATE" >= '1900-01-01' AND
				                        "END_DATE" <= '9999-12-31'`;

			entitlementFindList = await tx.run(entitlementFind);

			if (entitlementFindList.length != 0) {
				var Entitlement = entitlementFindList[0].ENTITLEMENT;
			} else {
				var Entitlement = "0.00"
			}

			var data = {
				employeeId: USERID,
				Claim_Code: claimcodeListValues[index].CLAIM_CODE,
				entitlement: Entitlement,
				taken: "0.00",
				pending: "0.00",
				YTDConsultation: "0.00",
				YTDOthers: "0.00",
				YTDWardCharges: "0.00",
				balance: "0.00",
				claimDate: CURRENT_DATE,
				totalWardDays: 0,
				consumedWardDays: 0,
				remainingWardDays: 0,
				pendingWardDays: 0,
				claimAmountWWPending: "0.00",
				claimAmountWW: "0.00",
				company: COMPANY
			}
			if (data.entitlement != 0) {
				let prorationPayload = {
					UserID: data.employeeId,
					Entitlement: data.entitlement,
					EmpType: "",
					WorkingPeriod: "",
					ClaimDetail: {
						Date: new Date(data.claimDate),
						Company: data.company,
						Claim_Code: data.Claim_Code,
						Claim_Category: claimcodeListValues[index].CATEGORY_CODE
					}
				};
				let prorationResult = await prorationRule(prorationPayload, req, true, {
					CLAIM_REFERENCE: ''
				});
				data.entitlement = parseInt(prorationResult.value) === 0 ? data.entitlement : parseInt(prorationResult.value);
				// data.remainingWardDays = data.totalWardDays - data.consumedWardDays - data.pendingWardDays;
			} else {
				data.totalWardDays = 0;
				data.remainingWardDays = 0;
			}
			if (claimcodeListValues[index].CATEGORY_CODE == 'MC') {
				var approvedMedicalClaimQuery =
					`SELECT "EMPLOYEE_ID",
				            "CLAIM_AMOUNT", 
				            "CLAIM_CONSULTATION_FEE",
				            "CLAIM_OTHER_COST",
				            "NO_OF_WARD_DAYS",
				            "WARD_CHARGES",
				            "CLAIM_AMOUNT_WW",
				            "HOSPITALIZATION_FEES"
				            FROM "BENEFIT_MEDICAL_CLAIM"
				        WHERE "EMPLOYEE_ID"=${data.employeeId} AND
				        	"CLAIM_STATUS"='Approved' AND `;

				var pendingMedicalClaimQuery =
					`
				SELECT "EMPLOYEE_ID",
				            "CLAIM_AMOUNT", 
				            "CLAIM_CONSULTATION_FEE",
				            "CLAIM_OTHER_COST",
				            "NO_OF_WARD_DAYS",
				            "WARD_CHARGES",
				            "CLAIM_AMOUNT_WW",
				            "HOSPITALIZATION_FEES"
				        FROM "BENEFIT_MEDICAL_CLAIM" 
				        WHERE "EMPLOYEE_ID"=${data.employeeId} AND 
				        	"CLAIM_STATUS" LIKE 'Pending for approval%' AND `;
			} else {
				if (claimcodeListValues[index].CLAIM_CODE == 'PTF') {
					var mainTable = 'BENEFIT_PTF_ACL_BCL_CLAIM'
				} else if (claimcodeListValues[index].CATEGORY_CODE == 'SP') {
					var mainTable = 'BENEFIT_SP_MASTER_CLAIM'
				} else if (claimcodeListValues[index].CATEGORY_CODE == 'SP1') {
					var mainTable = 'BENEFIT_SP1_MASTER_CLAIM'
				} else if (claimcodeListValues[index].CATEGORY_CODE == 'SP2') {
					var mainTable = 'BENEFIT_SP2_MASTER_CLAIM'
				} else if (claimcodeListValues[index].CATEGORY_CODE == 'SP3') {
					var mainTable = 'BENEFIT_SP3_MASTER_CLAIM'
				}
				var approvedMedicalClaimQuery =
					` SELECT "EMPLOYEE_ID" ,
			    							'${claimcodeListValues[index].CLAIM_CODE}' AS "CLAIM_CODE" ,
			    							"CLAIM_REFERENCE",
			    							"CLAIM_DATE" ,
			    							"CLAIM_CATEGORY",
			    							"CLAIM_AMOUNT",
			    							"SUBMITTED_BY",
			    							"CATEGORY_CODE",
			    							"BEHALF_FLAG",
			    							"CLAIM_STATUS",
			    							'0.00' as "CONSULTATION_FEE",
			    							'0.00' as "OTHER_COST",
			    							'0.00' as "WARD_CHARGES",
    										'0.00' as "HOSPITALIZATION_FEES",
    										'0.00' as "CLAIM_AMOUNT_WW",
    										'0.0' as"NO_OF_WARD_DAYS"
									FROM "${mainTable}" 
				        WHERE "EMPLOYEE_ID"=${data.employeeId} AND
				        	"CLAIM_STATUS"='Approved' AND `;

				var pendingMedicalClaimQuery =
					`SELECT "EMPLOYEE_ID" ,
			    							'${claimcodeListValues[index].CLAIM_CODE}' AS "CLAIM_CODE",
			    							"CLAIM_REFERENCE",
			    							"CLAIM_DATE" ,
			    							"CLAIM_CATEGORY",
			    							"CLAIM_AMOUNT",
			    							"SUBMITTED_BY",
			    							"CATEGORY_CODE",
			    							"BEHALF_FLAG",
			    							"CLAIM_STATUS",
			    							'0.00' as "CONSULTATION_FEE",
			    							'0.00' as "OTHER_COST",
			    							'0.00' as "WARD_CHARGES",
    										'0.00' as "HOSPITALIZATION_FEES",
    										'0.00' as "CLAIM_AMOUNT_WW",
    										'0.0' as"NO_OF_WARD_DAYS"
									FROM "${mainTable}" 
				        WHERE "EMPLOYEE_ID"=${data.employeeId} AND 
				        	"CLAIM_STATUS" LIKE 'Pending for approval%' AND `;
			}
			// let approvedMedicalClaimQuery =
			// 	`
			// SELECT * FROM "GET_DRAFT_CDS"('${USERID}')
			//         WHERE "CLAIM_STATUS"='Approved' AND `;

			// let pendingMedicalClaimQuery =
			// 	`
			// SELECT * FROM "GET_DRAFT_CDS"('${USERID}')
			//         WHERE "CLAIM_STATUS" LIKE 'Pending for approval%' AND `;

			let querySubString = '';
			if (claimcodeListValues[index].CLAIM_CODE === 'OPTS') {
				querySubString = `"CLAIM_CODE" IN ('OPTS', 'OPTD') AND "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'`;
			} else if (claimcodeListValues[index].CLAIM_CODE === "OPTD") {
				querySubString = `"CLAIM_CODE" IN ('OPTD') AND "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'`;
			} else if (claimcodeListValues[index].CATEGORY_CODE === "SP" || claimcodeListValues[index].CATEGORY_CODE === "SP1" ||
				claimcodeListValues[index].CATEGORY_CODE === "SP2" || claimcodeListValues[index].CATEGORY_CODE === "SP3") {
				querySubString = `"CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'`;
			} else {
				querySubString =
					`"CLAIM_CODE"='${claimcodeListValues[index].CLAIM_CODE}' AND "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'`;
			}

			approvedMedicalClaimQuery += querySubString;
			pendingMedicalClaimQuery += querySubString;
			let approvedClaims = await tx.run(approvedMedicalClaimQuery);
			let pendingClaims = await tx.run(pendingMedicalClaimQuery);

			if (approvedClaims.length === 0) {
				data.YTDConsultation = 0;
				data.YTDOthers = 0;
				data.YTDWardCharges = 0;
				data.taken = 0;
				data.balance = parseFloat(data.entitlement);
				data.claimAmountWW = 0;
				data.consumedWardDays = 0;
				data.YTDHospitalFee = 0;
			}
			if (!data.YTDWardCharges) {
				data.YTDWardCharges = 0;
			}

			for (let i = 0; i < approvedClaims.length; i++) {
				// Sanitized values
				approvedClaims[i].CLAIM_AMOUNT = (approvedClaims[i].CLAIM_AMOUNT) ? parseFloat(approvedClaims[i].CLAIM_AMOUNT) : 0;
				approvedClaims[i].CLAIM_CONSULTATION_FEE = (approvedClaims[i].CLAIM_CONSULTATION_FEE) ? parseFloat(approvedClaims[i].CLAIM_CONSULTATION_FEE) :
					0;
				approvedClaims[i].CLAIM_OTHER_COST = (approvedClaims[i].CLAIM_OTHER_COST) ? parseFloat(approvedClaims[i].CLAIM_OTHER_COST) : 0;
				approvedClaims[i].NO_OF_WARD_DAYS = (approvedClaims[i].NO_OF_WARD_DAYS) ? parseFloat(approvedClaims[i].NO_OF_WARD_DAYS) : 0;
				approvedClaims[i].CLAIM_AMOUNT_WW = (approvedClaims[i].CLAIM_AMOUNT_WW) ? parseFloat(approvedClaims[i].CLAIM_AMOUNT_WW) : 0;
				approvedClaims[i].HOSPITALIZATION_FEES = (approvedClaims[i].HOSPITALIZATION_FEES) ? parseFloat(approvedClaims[i].HOSPITALIZATION_FEES) :
					0;
				// Summation

				data.taken = parseFloat(data.taken) + parseFloat(approvedClaims[i].CLAIM_AMOUNT);
				data.consumedWardDays += parseFloat(approvedClaims[i].NO_OF_WARD_DAYS);
				data.claimAmountWW = parseFloat(data.claimAmountWW) + parseFloat(approvedClaims[i].CLAIM_AMOUNT_WW);
				// New logic for YTDConsultation and YTDOthers
				data.YTDConsultation = parseFloat(data.YTDConsultation) + parseFloat(approvedClaims[i].CLAIM_CONSULTATION_FEE);
				data.YTDOthers = parseFloat(data.YTDOthers) + parseFloat(approvedClaims[i].CLAIM_OTHER_COST);
				data.YTDHospitalFee = parseFloat(data.YTDHospitalFee) + parseFloat(approvedClaims[i].HOSPITALIZATION_FEES)
					// Old logic
					// // CLAIM_AMOUNT capping
					// let YTDConsultation = (approvedClaims[i].CONSULTATION_FEE > approvedClaims[i].CLAIM_AMOUNT) ? approvedClaims[i].CLAIM_AMOUNT :
					// 	approvedClaims[i].CONSULTATION_FEE;
					// data.YTDConsultation = parseFloat(data.YTDConsultation) + parseFloat(YTDConsultation);
					// // YTDOthers calculation
					// let YTDOthers = parseFloat(approvedClaims[i].CLAIM_AMOUNT) - parseFloat(approvedClaims[i].CONSULTATION_FEE);
					// data.YTDOthers = (YTDOthers > 0) ? parseFloat(data.YTDOthers) + parseFloat(YTDOthers) : data.YTDOthers;
					// YTDWardCharges calculation
				let YTDWardCharges = parseFloat(approvedClaims[i].CLAIM_AMOUNT) - parseFloat(approvedClaims[i].CLAIM_AMOUNT_WW);
				data.YTDWardCharges = parseFloat(data.YTDWardCharges) + parseFloat(YTDWardCharges);
			}
			data.taken = parseFloat2Decimals(data.taken);
			data.claimAmountWW = parseFloat2Decimals(data.claimAmountWW);
			data.YTDConsultation = parseFloat2Decimals(data.YTDConsultation);
			data.YTDOthers = parseFloat2Decimals(data.YTDOthers);
			data.YTDWardCharges = parseFloat2Decimals(data.YTDWardCharges);
			data.YTDHospitalFee = parseFloat2Decimals(data.YTDHospitalFee);

			if (pendingClaims.length === 0) {
				data.pending = 0;
				data.pendingWardDays = 0;
				data.claimAmountWWPending = 0;
			}
			for (let j = 0; j < pendingClaims.length; j++) {
				// Sanitized values
				pendingClaims[j].CLAIM_AMOUNT = (pendingClaims[j].CLAIM_AMOUNT) ? parseFloat(pendingClaims[j].CLAIM_AMOUNT) : 0;
				pendingClaims[j].NO_OF_WARD_DAYS = (pendingClaims[j].NO_OF_WARD_DAYS) ? parseFloat(pendingClaims[j].NO_OF_WARD_DAYS) : 0;
				pendingClaims[j].CLAIM_AMOUNT_WW = (pendingClaims[j].CLAIM_AMOUNT_WW) ? parseFloat(pendingClaims[j].CLAIM_AMOUNT_WW) : 0;

				// Summation
				data.pending = parseFloat(data.pending) + parseFloat(pendingClaims[j].CLAIM_AMOUNT);
				data.pendingWardDays += parseFloat(pendingClaims[j].NO_OF_WARD_DAYS);
				data.claimAmountWWPending = parseFloat(data.claimAmountWWPending) + parseFloat(pendingClaims[j].CLAIM_AMOUNT_WW);
			}
			data.pending = parseFloat2Decimals(data.pending);
			data.claimAmountWWPending = parseFloat2Decimals(data.claimAmountWWPending);

			if (data.claimAmountWWPending === 0 && data.claimAmountWW === 0) {
				data.balance = parseFloat2Decimals(parseFloat(data.entitlement) - parseFloat(data.taken) - parseFloat(data.pending));
			} else {
				data.balance = parseFloat2Decimals(parseFloat(data.entitlement) - parseFloat(data.claimAmountWW) - parseFloat(data.claimAmountWWPending));
				data.pending = parseFloat2Decimals(data.claimAmountWWPending);
				data.taken = parseFloat2Decimals(data.claimAmountWW);
			}

			if (data.Claim_Code === "OPTD") {
				let OPTSTaken = await tx.run(
					`SELECT EMPLOYEE_ID,
                        sum(CLAIM_AMOUNT) as CLAIM_AMOUNT
                        FROM "BENEFIT_MEDICAL_CLAIM"
                    WHERE "EMPLOYEE_ID"=${data.employeeId} AND
                        "CLAIM_CODE" IN ('OPTS')  AND
                        "CLAIM_STATUS"='Approved' AND
                        "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'
                    GROUP BY 
                        "EMPLOYEE_ID"`
				);

				let OPTSPending = await tx.run(
					`SELECT EMPLOYEE_ID,
                        sum(CLAIM_AMOUNT) as PENDING_AMOUNT
                        FROM "BENEFIT_MEDICAL_CLAIM"
                    WHERE "EMPLOYEE_ID"=${data.employeeId} AND
                        "CLAIM_CODE" IN ('OPTS') AND
                        "CLAIM_STATUS" LIKE 'Pending for approval%' AND
                        "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'
                    GROUP BY 
                        "EMPLOYEE_ID"`
				);

				OPTSTaken = (OPTSTaken.length > 0 && OPTSTaken[0].CLAIM_AMOUNT) ? parseFloat(OPTSTaken[0].CLAIM_AMOUNT) : 0;
				OPTSPending = (OPTSPending.length > 0 && OPTSPending[0].PENDING_AMOUNT) ? parseFloat(OPTSPending[0].PENDING_AMOUNT) : 0;

				let entitlement = parseFloat(data.entitlement);
				if ((entitlement - OPTSTaken - OPTSPending) < 0) {
					let OPTSOverflow = (OPTSTaken + OPTSPending) - entitlement;
					if (OPTSTaken > entitlement) {
						data.taken = parseFloat2Decimals(parseFloat(data.taken) + (OPTSTaken - entitlement));
						OPTSOverflow = OPTSOverflow - (OPTSTaken - entitlement);
					}
					data.pending = parseFloat2Decimals(parseFloat(data.pending) + OPTSOverflow);
				}
			}

			data.balance = parseFloat2Decimals(parseFloat(data.entitlement) - parseFloat(data.taken) - parseFloat(data.pending));
			//===========================================================
			//                  Ward days logic
			//===========================================================

			// let eligibilitySQL =
			// 	`SELECT  "CLAIM_CODE",
			//                   "SEQUENCE",
			//                   "EFFECTIVE_DATE",
			//                   "END_DATE",
			//                   "ENTITLEMENT",
			//                   "CATEGORY_CODE",
			//                   "CATEGORY_DESC"
			//             FROM "SF_EMPLOYEEELIGIBILITY"('${data.employeeId}')
			//                 WHERE  "CLAIM_CODE" = 'HOSPS_Day'  AND
			//                         "EFFECTIVE_DATE" >= '1900-01-01' AND
			//                         "END_DATE" <= '9999-12-31'`;

			// let eligibilityData = await tx.run(eligibilitySQL);
			// if (entitlementFindList.length > 0 && data.Claim_Code == 'HOSPS_DAY') {
			// 	let prorationPayload = {
			// 		UserID: data.employeeId,
			// 		Entitlement: entitlementFindList[0].ENTITLEMENT,
			// 		EmpType: "",
			// 		WorkingPeriod: "",
			// 		ClaimDetail: {
			// 			Date: new Date(data.claimDate),
			// 			Company: data.company,
			// 			Claim_Code: data.Claim_Code,
			// 			Claim_Category: entitlementFindList[0].CATEGORY_CODE
			// 		}
			// 	};
			// 	let prorationResult = await prorationRule(prorationPayload, req, false);
			// 	data.totalWardDays = parseInt(prorationResult.value);
			// 	data.remainingWardDays = data.totalWardDays - data.consumedWardDays - data.pendingWardDays;
			// } else {
			// 	data.totalWardDays = 0;
			// 	data.remainingWardDays = 0;
			// }

			finalValues.push({
				EMPLOYEE: data.employeeId,
				CLAIM_CODE_VALUE: data.Claim_Code,
				DESCRIPTION: claimcodeListValues[index].DESCRIPTION,
				YEAR: CLAIM_YEAR,
				YTD_OTHER: data.YTDOthers,
				YTD_CONSULT: data.YTDConsultation,
				YTD_WARD_CHARGE: data.YTDWardCharges,
				YTD_HOSPITAL_FEE: data.YTDHospitalFee,
				PENDING_AMOUNT: data.pending,
				TAKEN_AMOUNT: data.taken,
				BALANCE: data.balance,
				ENTITLEMENT: data.entitlement,
				PAY_GRADE: employeevaluesid.PAYGRADE,
				PERSONAL_AREA: employeevaluesid.PERSONAL_AREA,
				PERSONAL_SUB_AREA: employeevaluesid.PERSONAL_SUB_AREA,
				DEPARMENT: employeevaluesid.DEPARTMENT,
				DIVISION: employeevaluesid.DIVISION
			});
		}
		return finalValues;
}