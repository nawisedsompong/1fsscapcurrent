const cds = require('@sap/cds');
const dbClass = require("sap-hdbext-promisfied");
const hdbext = require("@sap/hdbext");
const nodemailer = require("nodemailer");
const rp = require('request-promise');
const xsenv = require('@sap/xsenv');
const prorationRule = require('./proration-rule-util');
// const { 
// 	DynamicPool
// } = require("node-worker-threads-pool");
const {
	StaticPool
} = require('node-worker-threads-pool');
// const uuid = require("uuid/v4");
//Master
const dest_service = xsenv.getServices({
	dest: {
		tag: 'destination'
	}
}).dest;
const uaa_service = xsenv.getServices({
	uaa: {
		tag: 'xsuaa'
	}
}).uaa;
const sUaaCredentials = dest_service.clientid + ':' + dest_service.clientsecret;
const sCPIEmailDestinationName = 'Benefit_Email_Notification_CPI';

module.exports = async(srv) => {

	const db = await cds.connect.to("db");
	const {
		approval,
		approval_structure,
		approval_structure_hr,
		Benefit_Claim_Admin,
		Claim_Admin,
		Claim_Category,
		Claim_Clinic,
		Claim_Code,
		Claim_Department,
		Claim_Division,
		Claim_Pa,
		Claim_Paycomponent,
		Claim_Pay_Grade,
		Claim_PSA,
		Claim_Specialisation,
		Claim_Sponsor,
		Claim_Status,
		Company_Claim_Category,
		Company_Master,
		Demo_Hana,
		overtime_claim,
		Benefit_Eligibility,
		Co_Payment,
		EMPLOYEE_MASTER,
		Medical_Claim,
		WRC_HR_LINEITEM_CLAIM,
		WRC_HR_MASTER_CLAIM,
		WRC_MASTER_CLAIM,
		WRC_LINEITEM_CLAIM,
		WRC_CLAIM_TYPE,
		Location_RO,
		masterandLocation,
		claimApproverView,
		Benefit_Transport_Amount,
		TC_MASTER_CLAIM,
		TC_LINEITEM_CLAIM,
		COV_MASTER_CLAIM,
		COV_LINEITEM_CLAIM,
		PC_CLAIM,
		PTF_ACL_BCL_CLAIM,
		SP_MASTER_CLAIM,
		SP_LINEITEM_CLAIM,
		SP1_MASTER_CLAIM,
		SP1_LINEITEM_CLAIM,
		SP2_MASTER_CLAIM,
		SP2_LINEITEM_CLAIM,
		SP3_MASTER_CLAIM,
		SP3_LINEITEM_CLAIM,
		SDFC_MASTER_CLAIM,
		SDFC_LINEITEM_CLAIM,
		SDFR_MASTER_CLAIM,
		SDFR_LINEITEM_CLAIM,
		CPC_MASTER_CLAIM,
		CPC_LINEITEM_CLAIM,
		OC_MASTER_CLAIM,
		OC_LINEITEM_CLAIM,
		PAY_UP_MASTER_CLAIM,
		PAY_UP_LINEITEM_CLAIM,
		AHP_LIC_MS_WIC_CLAIM,
		CPR_CLAIM,
		Benefit_Entitlement_Adjust,
		CLAIM_CANCEL_MASTER,
		BEN_LOCATION,
		VEHICLE_RATE,
		Medisave_Credit,
		Approval_Histroy,
		DELEGATOR,
		CLAIM_COORDINATOR,
		ADMIN_ROLE,
		GL_MAPPING,
		VENDOR,
		CURRENCY,
		ADMIN_TILE_LIST
	} = srv.entities('benefit');

	const {
		EmpJob,
		HolidayAssignment,
		EmpEmployment,
		EmpJobPartTime,
		EmployeeTime,
		v_FOLocation,
		PerEmail,
		PerPersonRelationship,
		claimPostingCutoff
	} = srv.entities('sf');

	const {
		EMP_MASTER_DETAILS,
		PRORATED_CLAIMS_YTD,
		THREAD_JOB_INFO
	} = srv.entities('calculation');
	// srv.on('userValidation', async(req) => {
	// 	let tx = cds.transaction(req),
	// 		filterObject;
	// 	if (req.data.USERID == "") {
	// 		filterObject = {
	// 			"EMAIL": req.user.id
	// 		}
	// 	} else {
	// 		filterObject = {
	// 			"USERID": req.data.USERID
	// 		}
	// 	}

	// 	var oEmployeeData = await tx.run(
	// 		SELECT.from(EMPLOYEE_MASTER).where(filterObject));

	// 	return JSON.stringify(oEmployeeData);
	// });
	srv.on('userValidation', async(req) => {
		let tx = cds.transaction(req),
			filterObject, userid = "";
		console.log(req.user.id);
		if (req.data.USERID == "") {
			filterObject = {
					"EMAILADDRESS": req.user.id
				}
				// filterObject = {
				// 	"EMAILADDRESS": '47001985@mohh.com'
				// }
			var oEmployeeMail = await tx.run(
				SELECT.from(PerEmail).where(filterObject));

			if (oEmployeeMail.length <= 0) {
				req.reject(400, "Employee data not found");
			} else {
				userid = oEmployeeMail[0].personIdExternal;
			}

		} else {
			userid = req.data.USERID;
		}

		//Check Whether Employee is Active
		var oEmpEmployment = await tx.run(
			SELECT.from(EmpEmployment).where({
				personIdExternal: userid,
				startDate: {
					// '<=': new Date().toISOString().replace("T", " ").substring(0, 19)
					'<=': new Date().toISOString().split('T')[0]+' 00:00:00'
				},
				and: {
					endDate: {
						// '>=': new Date().toISOString().replace("T", " ").substring(0, 19)
						'>=': new Date().toISOString().split('T')[0]+' 00:00:00'
					},
					or: {
						endDate: null
					}
				}
			}));

		if (oEmpEmployment.length <= 0) {
			req.reject(400, "Employee is not Active anymore");
		}

		var vCalculation =
			`SELECT * FROM "CALCULATION_EMP_MASTER_DETAILS"
	(placeholder."$$USER_ID$$"=>'${userid}')`
		var oEmployeeData = await tx.run(vCalculation);
		
		if(oEmployeeData.length == 0){
			req.reject(400, "Employee is not Available ");
		}
		
		var dataList=  oEmployeeData[0];
		var dAdminData =
			`SELECT * FROM "BENEFIT_ADMIN_ROLE" WHERE EMPLOYEE_ID='${userid}' 
			AND START_DATE <= CURRENT_DATE AND END_DATE >= CURRENT_DATE`;
			
		dataList.adminList = await tx.run(dAdminData);
		
		return JSON.stringify(dataList);
	});
	
	srv.on('EmployeeDetailsFetch', async(req) => {
		let tx = cds.transaction(req),
			filterObject, userid = "";
		console.log(req.user.id);
		if (req.data.USERID == "") {
			filterObject = {
					"EMAILADDRESS": req.user.id
				}
				// filterObject = {
				// 	"EMAILADDRESS": '47001985@mohh.com'
				// }
			var oEmployeeMail = await tx.run(
				SELECT.from(PerEmail).where(filterObject));

			if (oEmployeeMail.length <= 0) {
				req.reject(400, "Employee data not found");
			} else {
				userid = oEmployeeMail[0].personIdExternal;
			}

		} else {
			userid = req.data.USERID;
		}

		//Check Whether Employee is Active
		// var oEmpEmployment = await tx.run(
		// 	SELECT.from(EmpEmployment).where({
		// 		personIdExternal: userid,
		// 		startDate: {
		// 			'<=': new Date().toISOString().replace("T", " ").substring(0, 19)
		// 		},
		// 		and: {
		// 			endDate: {
		// 				'>=': new Date().toISOString().replace("T", " ").substring(0, 19)
		// 			},
		// 			or: {
		// 				endDate: null
		// 			}
		// 		}
		// 	}));

		// if (oEmpEmployment.length <= 0) {
		// 	req.reject(400, "Employee is not Active anymore");
		// }

		var vCalculation =
			`SELECT * FROM "CALCULATION_EMP_MASTER_DETAILS"
	(placeholder."$$USER_ID$$"=>'${userid}')`
		var oEmployeeData = await tx.run(vCalculation);

		return JSON.stringify(oEmployeeData);
	});

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
	}
	
	function dateTimeFormat(dateValue) {
		var sDate = new Date(dateValue).toISOString();
		var splittedDate = sDate.split("T");
		splittedDate[1] = splittedDate[1].split(".")[0];
		var sFormattedDate = splittedDate.join(" ");
		return sFormattedDate;
	}

	function dateFormatDDMMYYYY(pdate) {
		var ldate = new Date(pdate)
		var date = ldate.getDate();
		var month = ldate.getMonth();
		var year = ldate.getFullYear();
		var ddmmyyyy = pad(date) + "-" + pad(month + 1) + "-" + year;
		return ddmmyyyy;
	}

	function dateFormatForClaimReference(oDate) {
		var dateObj = new Date(oDate);
		var date = dateObj.getDate();
		var month = dateObj.getMonth();
		var year = dateObj.getFullYear();
		var formattedDate = year + "" + pad(month + 1) + "" + pad(date);
		return formattedDate;
	}

	function pad(n) {
		return n < 10 ? '0' + n : n
	}
	srv.on('ProrationRule', async(req) => {
		let tx = cds.transaction(req);
		var userData = req.data;
		console.log(userData);

		// Logic for hire and exit date
		try {
			var employeeDetails = await tx.run(SELECT.from(EmpEmployment).where({
				userId: userData.UserID
			}));
			// employeeDetails = employeeDetails[0];
			console.log("employeeDetails", employeeDetails)
			if (employeeDetails.length <= 0) {
				req.reject(400, "Employee data not found");
			}
			employeeDetails = employeeDetails[0];
			var ClaimDetail = req.data.ClaimDetail;
			// Below code is temporary fix, we are getting empEmployment.endDate as null, so change it to end of year wrt start date
			if (employeeDetails.endDate == null) {
				employeeDetails.endDate = new Date(new Date(ClaimDetail.Date).getFullYear(), 11, 31);
				employeeDetails.endDate = dateFormat(employeeDetails.endDate);
				// employeeDetails.endDate = '9999-12-31 00:00:00'
			}
			// Below code is temporary fix, we are getting empEmployment.endDate as null, so change it to end of year wrt start date

			// check if the employee is hired or contractor.
			var empJob = await tx.run(SELECT.from(EmpJobPartTime).where({
				userId: userData.UserID
					// End_Date: {
					// '<=': ClaimDetail.Start_Date
					// }
			}));
			// console.log(empJob);
			console.log(ClaimDetail);
			// check if the employee is hired or contractor.
			/*var Benefit_Claim_Admin = await tx.run(SELECT.from(Benefit_Claim_Admin).where({
				Claim_Code: ClaimDetail.Claim_Code,
				Claim_Category: ClaimDetail.Claim_Category,
				Start_Date: {
						'>=': ClaimDetail.Start_Date
				},
				End_Date: {
						'>=': ClaimDetail.Start_Date
				}
			}));*/
			var Benefit_Entitlement = await tx.run(SELECT.from(Benefit_Entitlement_Adjust).where({
				emp_Id: userData.UserID,
				Claim_code: ClaimDetail.Claim_Code,
				Year: new Date(ClaimDetail.Date).getFullYear().toString()
			}));
			var GV_BenefitAdjust = 0.0;
			if (Benefit_Entitlement.length > 0) {
				Benefit_Entitlement = Benefit_Entitlement[0];
				console.log(Benefit_Entitlement);
				GV_BenefitAdjust = parseFloat(Benefit_Entitlement.Adjustment);
			}
			var claimAdmin = await tx.run(SELECT.from(Benefit_Claim_Admin).where({
				Claim_Code: ClaimDetail.Claim_Code,
				Claim_Category: ClaimDetail.Claim_Category,
				Start_Date: {
					'<=': ClaimDetail.Date
				},
				End_Date: {
					'>=': ClaimDetail.Date
				}

			}));
			// console.log(claimAdmin);
			if (claimAdmin.length > 0)
				claimAdmin = claimAdmin[0];
			else
				return req.reject(400, "Claim info not found");
			// Calculate No Pay Leave
			/*var NoPayLeave = await tx.run(SELECT(['sum(quantityInDays) as quantityInDays']).from(EmployeeTime).where({
				userId: userData.UserID,
				// quantityInDays : 'is not null'
				// Claim_Category: ClaimDetail.Claim_Category,
				startDate: {
						'>=': ClaimDetail.Start_Date
				},
				endDate: {
						'<=': ClaimDetail.Start_Date
				},
				or: [{externalCode: '1211'},{externalCode: '1212'},{externalCode: '1213'},{externalCode: '1214'}
				,{externalCode: '1215'},{externalCode: '1216'},,{externalCode: '1217'}]
			}));*/
			// var NoPayLeave = await tx.run(SELECT.one(['sum(quantityInDays) as quantityInDays']).from(EmployeeTime).where(
			// 	'userId=',  userData.UserID
			// 	// ,
			// 	// ' and HolidayOrExceptions<=', vedate, ' and HolidayOrExceptions>=', vsdate
			// 	))
			// var NoPayLeave = await tx.run(Select.from(EmployeeTime).columns(o -> o.quantityInDays().sum().as("quantityInDays")));
			// var approvedStstus = 'APPROVED';
			const leaveSQL1 =
				`SELECT SUM(quantityInDays) as quantityInDays, USERID
                    FROM "SF_EMPLOYEETIME"
                    WHERE 
                    USERID = ${userData.UserID} AND
                    STARTDATE  >= '${employeeDetails.startDate}' AND
                    STARTDATE  <=  '${employeeDetails.endDate}' AND
                    APPROVALSTATUS  = 'APPROVED' AND QUANTITYINDAYS is not null AND
                    TIMETYPE IN ('1211', '1212', '1213', '1214', '1215', '1216', '1217') GROUP BY USERID`;
			const NoPayLeave = await tx.run(leaveSQL1);
			console.log("NoPayLeave", NoPayLeave)
				// Calculate No Pay Leave

			if (empJob.length <= 0) {

				// var sdate = new Date(employeeDetails.startDate);
				// var edate = new Date(employeeDetails.endDate);
				var ldate = new Date(new Date(claimAdmin.Start_Date).getFullYear(), 11, 31);
				var fdate = new Date(new Date(claimAdmin.Start_Date).getFullYear(), 0, 1);
				if (new Date(employeeDetails.startDate) <= fdate && new Date(employeeDetails.endDate) >= ldate) {
					console.log("Inside", req.data.Entitlement);
					console.log("GV_BenefitAdjust", GV_BenefitAdjust);
					return parseFloat(req.data.Entitlement) + GV_BenefitAdjust;
				}
				// console.log(employeeDetails);
				// console.log(new Date())
				// console.log(new Date(employeeDetails.startDate))
				var difference = differenceBetweenDays(new Date(employeeDetails.startDate), new Date(employeeDetails.endDate));

				if (NoPayLeave.length > 0) {
					difference = difference - NoPayLeave[0].QUANTITYINDAYS;
					console.log(NoPayLeave[0].QUANTITYINDAYS)
				}

				var work = 0.0;
				// console.log(sdate,edate);
				console.log("difference", difference)

				switch (claimAdmin.Probation_Type) {
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
				console.log("work", work);
				if (NoPayLeave.length > 0)
					work = work - NoPayLeave[0].QUANTITYINDAYS;
				return (work * req.data.Entitlement) + GV_BenefitAdjust;
			} else {

				// logic for part timer
				console.log("Else");

				// console.log(console.log(empJob[0]));
				// console.log("empJob",empJob);
				var empJob = await tx.run(SELECT.from(EmpJobPartTime).where({
					userId: userData.UserID,
					startDate: {
						'<=': ClaimDetail.Date
					}
				}));
				if (empJob.length > 0) {
					empJob = empJob[0];
					// console.log("company", empJob);
					var FOLocation = await tx.run(SELECT.from(v_FOLocation).where({
						externalCode: empJob.company
							// startDate: {
							// 	'<=': ClaimDetail.Start_Date
							// }
					}));
					if (FOLocation.length > 0) {
						FOLocation = FOLocation[0];
						// console.log(FOLocation);
						if (new Date(employeeDetails.startDate) < fdate && new Date(employeeDetails.endDate) > ldate) {
							var work1 = empJob.standardHours / FOLocation.standardHours;
							return (work1 * req.data.Entitlement) + GV_BenefitAdjust;
						} else {
							var difference1 = differenceBetweenDays(new Date(employeeDetails.startDate), new Date(employeeDetails.endDate));

							if (NoPayLeave.length > 0) {
								difference1 = difference1 - NoPayLeave[0].QUANTITYINDAYS;
								console.log(NoPayLeave[0].QUANTITYINDAYS)
							}
							var work1 = 0.0;
							console.log(employeeDetails.startDate, employeeDetails.endDate);
							console.log("difference1", difference1);
							console.log("claimAdmin.Probation_Type", claimAdmin.Probation_Type)

							switch (claimAdmin.Probation_Type) {
							case 'Days':
								work1 = difference1 / 365;
								break;
							case 'Week':
								work1 = Math.round(difference1 / 7);
								work1 = work1 / 52;
								break;
							case 'Month':
								work1 = Math.round(difference1 / 30);
								work1 = work1 / 12;
								break;
							}
							console.log("work1", work1);

							// console.log("work1",work1)
							var Entitlement = work1 * req.data.Entitlement;
							return (Entitlement * work1) + GV_BenefitAdjust;
						}
					} else {
						// return req.reject('Employee data not found')
						return req.reject(400, "Employee data not found");
					}

					// console.log(FOLocation);*
				} else {
					return req.reject(400, "Employee data not found");
				}

				// console.log(req.data);

			}
		} catch (error) {
			console.log(error)
			req.reject(error);
		}

	});

	srv.on('ProrationRule1', async(req) => {
		return await prorationRule(req.data, req, false);
		/*let tx = cds.transaction(req);
		var userData = req.data;
		console.log(userData);

		// Logic for hire and exit date
		try {
			var employeeDetails = await tx.run(SELECT.from(EmpEmployment).where({
				userId: userData.UserID
			}));
			// employeeDetails = employeeDetails[0];
			console.log("employeeDetails", employeeDetails)
			if (employeeDetails.length <= 0) {
				req.reject(400, "Employee data not found");
			}
			employeeDetails = employeeDetails[0];
			var ClaimDetail = req.data.ClaimDetail;
			// Below code is temporary fix, we are getting empEmployment.endDate as null, so change it to end of year wrt start date
			if (employeeDetails.endDate == null) {
				// employeeDetails.endDate = new Date(new Date(ClaimDetail.Date).getFullYear(), 11, 31);
				// employeeDetails.endDate = dateFormat(employeeDetails.endDate);

				// Below line is uncommented to satisfy null condition in below query at line no. 434
				employeeDetails.endDate = '9999-12-31 00:00:00'
			}
			employeeDetails.partTime = false;
			employeeDetails.permanent = false;
			ClaimDetail.yearEnd = dateFormat(new Date(new Date(ClaimDetail.Date).getFullYear(), 11, 31));
			ClaimDetail.yearStart = dateFormat(new Date(new Date(ClaimDetail.Date).getFullYear(), 0, 01));
			// Below code is temporary fix, we are getting empEmployment.endDate as null, so change it to end of year wrt start date

			// check if the employee is hired or contractor.
			var empJob = await tx.run(SELECT.from(EmpJobPartTime).where({
				userId: userData.UserID
					// End_Date: {
					// '<=': ClaimDetail.Start_Date
					// }
			}));

			// Interchanged ClaimDetail.yearStart & ClaimDetail.yearEnd in below query
			var empJob =
				`SELECT *
                        FROM "SF_EMPJOB"
                    WHERE USERID = '${userData.UserID}' AND
                        STARTDATE >= '${employeeDetails.startDate}' AND ENDDATE <= '${employeeDetails.endDate}'
                        AND (YEAR(STARTDATE) <=  YEAR('${ClaimDetail.yearEnd}') AND (YEAR(ENDDATE) >= YEAR('${ClaimDetail.yearStart}')) )
                    ORDER BY seqNumber DESC`;
			// console.log(empJob);
			console.log(empJob);
			const resEmpJob = await tx.run(empJob);
			// console.log("resEmpJob", resEmpJob)
			if (resEmpJob.length <= 0) {
				return req.reject(400, "Employee data not found");
			}
			resEmpJob.forEach(function (data) {
				// console.log(element);
				var partTime = ['CP', 'PP', 'PT'];
				if (partTime.includes(data.EMPLOYEETYPE)) {
					employeeDetails.partTime = true;
				} else {
					employeeDetails.permanent = true;
				}
			});
			console.log("employeeDetails", employeeDetails);

			// check if the employee is hired or contractor.

			var Benefit_Entitlement = await tx.run(SELECT.from(Benefit_Entitlement_Adjust).where({
				emp_Id: userData.UserID,
				Claim_code: ClaimDetail.Claim_Code,
				Year: new Date(ClaimDetail.Date).getFullYear().toString()
			}));
			var GV_BenefitAdjust = 0.0;
			if (Benefit_Entitlement.length > 0) {
				Benefit_Entitlement = Benefit_Entitlement[0];
				console.log(Benefit_Entitlement);
				GV_BenefitAdjust = parseFloat(Benefit_Entitlement.Adjustment);
			}
			var claimAdmin = await tx.run(SELECT.from(Benefit_Claim_Admin).where({
				Claim_Code: ClaimDetail.Claim_Code,
				Claim_Category: ClaimDetail.Claim_Category,
				Start_Date: {
					'<=': ClaimDetail.Date
				},
				End_Date: {
					'>=': ClaimDetail.Date
				}

			}));
			// console.log(claimAdmin);
			if (claimAdmin.length > 0)
				claimAdmin = claimAdmin[0];
			else
				return req.reject(400, "Claim info not found");
			// Calculate No Pay Leave
			const leaveSQL1 =
				`SELECT SUM(quantityInDays) as quantityInDays, USERID
                    FROM "SF_EMPLOYEETIME"
                    WHERE 
                    USERID = ${userData.UserID} AND
                    STARTDATE  >= '${ClaimDetail.yearStart}' AND
                    STARTDATE  <=  '${ClaimDetail.yearEnd}' AND
                    APPROVALSTATUS  = 'APPROVED' AND QUANTITYINDAYS is not null AND
                    TIMETYPE IN ('1211', '1212', '1213', '1214', '1215', '1216', '1217') GROUP BY USERID`;
			const NoPayLeave = await tx.run(leaveSQL1);
			console.log("NoPayLeave", NoPayLeave)
				// Calculate No Pay Leave
			let entitlementRounding = claimAdmin.Entitlement_Rounding;
			if (employeeDetails.partTime && employeeDetails.permanent) {
				var work = regularEmpCalculation(claimAdmin, employeeDetails, req);
				// if (NoPayLeave.length > 0)
				// 	work = work - NoPayLeave[0].QUANTITYINDAYS;
				// if (NoPayLeave.length > 0) {
				// 	if (NoPayLeave[0].QUANTITYINDAYS > 30)
				// 		work = work - NoPayLeave[0].QUANTITYINDAYS;
				// 	console.log(NoPayLeave[0].QUANTITYINDAYS)
				// }
				// Part Time 
				var Entitlement = 0.0;
				if (resEmpJob.length > 0) {
					empJob = resEmpJob[0];
					console.log("company", empJob);
					var FOLocation = await tx.run(SELECT.from(v_FOLocation).where({
						externalCode: empJob.LOCATION
							// startDate: {
							// 	'<=': ClaimDetail.Start_Date
							// }
					}));
					console.log("FOLocation", FOLocation)
					if (FOLocation.length > 0) {
						var work1 = partTimeCalculation(FOLocation, claimAdmin, employeeDetails, NoPayLeave, resEmpJob);
						Entitlement = work1 * req.data.Entitlement;
						// console.log("Entitlement",Entitlement)
						// return (Entitlement) + GV_BenefitAdjust;
					} else {
						// return req.reject('Employee data not found')
						return req.reject(400, "Employee data not found");
					}

					// console.log(FOLocation);*
				} else {
					return req.reject(400, "Employee data not found");
				}

				work = work * req.data.Entitlement;

				if (entitlementRounding.includes('Round down Nearest Dollar')) {
					work = Math.floor(work);
				} else if (entitlementRounding.includes('Round Up Nearest Dollar')) {
					work = Math.ceil(work);
				} else {
					work = parseFloat(parseFloat(work).toFixed(2));
				}

				if (entitlementRounding.includes('Round down Nearest Dollar')) {
					Entitlement = Math.floor(Entitlement);
				} else if (entitlementRounding.includes('Round Up Nearest Dollar')) {
					Entitlement = Math.ceil(Entitlement);
				} else {
					Entitlement = parseFloat(parseFloat(Entitlement).toFixed(2));
				}

				return work + Entitlement + GV_BenefitAdjust;

			} else if (employeeDetails.permanent) {
				var work = regularEmpCalculation(claimAdmin, employeeDetails, req);
				// if (NoPayLeave.length > 0)
				// 	work = work - NoPayLeave[0].QUANTITYINDAYS;
				// if (NoPayLeave.length > 0) {
				// 	if (NoPayLeave[0].QUANTITYINDAYS > 30)
				// 		work = work - NoPayLeave[0].QUANTITYINDAYS;
				// 	console.log(NoPayLeave[0].QUANTITYINDAYS)
				// }
				work = work * req.data.Entitlement;

				if (entitlementRounding.includes('Round down Nearest Dollar')) {
					work = Math.floor(work);
				} else if (entitlementRounding.includes('Round Up Nearest Dollar')) {
					work = Math.ceil(work);
				} else {
					work = parseFloat(parseFloat(work).toFixed(2));
				}
				return work + GV_BenefitAdjust;
			} else if (employeeDetails.partTime) {

				// logic for part timer
				console.log("Else");

				// console.log(console.log(empJob[0]));
				// console.log("empJob",empJob);
				// var empJob = await tx.run(SELECT.from(EmpJobPartTime).where({
				// 	userId: userData.UserID,
				// 	startDate: {
				// 		'<=': ClaimDetail.Date
				// 	}
				// }));

				if (resEmpJob.length > 0) {
					empJob = resEmpJob[0];
					console.log("company", empJob);
					var FOLocation = await tx.run(SELECT.from(v_FOLocation).where({
						externalCode: empJob.LOCATION
							// startDate: {
							// 	'<=': ClaimDetail.Start_Date
							// }
					}));
					console.log("FOLocation", FOLocation)
					if (FOLocation.length > 0) {
						var work1 = partTimeCalculation(FOLocation, claimAdmin, employeeDetails, NoPayLeave, resEmpJob);
						work1 = work1 * req.data.Entitlement;

						if (entitlementRounding.includes('Round down Nearest Dollar')) {
							work1 = Math.floor(work1);
						} else if (entitlementRounding.includes('Round Up Nearest Dollar')) {
							work1 = Math.ceil(work1);
						} else {
							work1 = parseFloat(parseFloat(work1).toFixed(2));
						}
						// console.log("Entitlement",Entitlement)
						return work1 + GV_BenefitAdjust;
					} else {
						// return req.reject('Employee data not found')
						return req.reject(400, "Employee data not found");
					}

					// console.log(FOLocation);*
				} else {
					return req.reject(400, "Employee data not found");
				}

				// console.log(req.data);

			}
		} catch (error) {
			console.log(error)
			req.reject(error);
		}*/

	});

	/*function regularEmpCalculation(claimAdmin, employeeDetails, req) {
		var ldate = new Date(new Date(claimAdmin.Start_Date).getFullYear(), 11, 31);
		var fdate = new Date(new Date(claimAdmin.Start_Date).getFullYear(), 0, 1);
		if (new Date(employeeDetails.startDate) <= fdate && new Date(employeeDetails.endDate) >= ldate) {
			//console.log("Inside", req.data.Entitlement);
			// console.log("GV_BenefitAdjust", GV_BenefitAdjust);
			return parseFloat(1); // Returning 1 because, it will be multipled with entitlement
		}
		if (new Date(employeeDetails.startDate) <= fdate) {
			employeeDetails.startDate = fdate;
		}
		if (new Date(employeeDetails.endDate) >= ldate) {
			employeeDetails.endDate = ldate;
		}
		// console.log("employeeDetails",employeeDetails);
		// console.log(new Date())
		// console.log(new Date(employeeDetails.startDate))
		var difference = differenceBetweenDays(new Date(employeeDetails.startDate), new Date(employeeDetails.endDate));

		var work = 0.0;
		console.log(fdate, "fdate");
		console.log("difference", difference)
		switch (claimAdmin.Probation_Type) {
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
		console.log("work", work);

		return work;
	};

	function partTimeCalculation(FOLocation, claimAdmin, employeeDetails, NoPayLeave, resEmpJob) {
		FOLocation = FOLocation[0];
		// FOLocation.standardHours = parseFloat(FOLocation.standardHours);
		// resEmpJob[0].STANDARDHOURS = parseFloat(resEmpJob[0].STANDARDHOURS);
		var ldate = new Date(new Date(claimAdmin.Start_Date).getFullYear(), 11, 31);
		var fdate = new Date(new Date(claimAdmin.Start_Date).getFullYear(), 0, 1);
		// console.log(FOLocation);
		var work1 = 0.0;
		var workOut = 0.0;
		for (var i = 0; i < resEmpJob.length; i++) {
			employeeDetails.startDate = resEmpJob[i].STARTDATE;
			employeeDetails.endDate = resEmpJob[i].ENDDATE;
			// if (new Date(employeeDetails.startDate) <= fdate && new Date(employeeDetails.endDate) >= ldate) {
			// 	// If this is true then we will not have multiple allocation for employee because its maximum duration for finance year
			// 	work1 = empJob.standardHours / FOLocation.standardHours;
			// 	// work1 = (work1 * req.data.Entitlement) ;
			// } else {
			if (new Date(employeeDetails.startDate) <= fdate) {
				employeeDetails.startDate = fdate;
				// console.log("Inside IF")
			}
			if (new Date(employeeDetails.endDate) >= ldate) {
				employeeDetails.endDate = ldate;
			}
			// if (NoPayLeave.length > 0) {
			// 	difference1 = difference1 - NoPayLeave[0].QUANTITYINDAYS;
			// 	console.log(NoPayLeave[0].QUANTITYINDAYS)
			// }
			var difference1 = differenceBetweenDays(new Date(employeeDetails.startDate), new Date(employeeDetails.endDate));
			// work1 = 0.0;
			console.log(employeeDetails.startDate, employeeDetails.endDate);
			console.log("difference1", difference1);
			console.log("claimAdmin.Probation_Type", claimAdmin.Probation_Type)

			console.log("resEmpJob", resEmpJob);

			console.log("work1", resEmpJob[0].STANDARDHOURS)
				// return work1;
				// }
			workOut = workOut + (difference1 * (resEmpJob[0].STANDARDHOURS / FOLocation.standardHours));
			// workOut = workOut + (difference1 * (resEmpJob[0].standardHours));
			console.log("workOut", workOut);
		}
		switch (claimAdmin.Probation_Type) {
		case 'Days':
			workOut = workOut / 365;
			break;
		case 'Week':
			workOut = Math.round(workOut / 7);
			workOut = workOut / 52;
			break;
		case 'Month':
			workOut = Math.round(workOut / 30);
			workOut = workOut / 12;
			break;
		}
		// if(work1 == 0.0){
		// 	return work1 * workOut
		// }else

		return workOut;
	};*/

	srv.on('BenefitTransportReceiptAmount', async(req) => {
		let tx = cds.transaction(req);
		var userData = req.data;
		console.log(userData);
		var lv_Benefit_Transport_Amount = await tx.run(SELECT.from(Benefit_Transport_Amount).where({
			DIVISION_FROM: userData.DivisionFrom,
			DIVISION_TO: userData.DivisionTo,
			VEHICLE_CODE: userData.VehicleCode
		}));

		if (lv_Benefit_Transport_Amount.length > 0) {
			lv_Benefit_Transport_Amount = lv_Benefit_Transport_Amount[0];
			return (lv_Benefit_Transport_Amount.DISTANCE * lv_Benefit_Transport_Amount.RATE) + (userData.ERP * userData.ParkingCost);
		}

	});
	srv.on('DropDowns', async(req) => {
		let tx = cds.transaction(req),
			body = {
				'COMPANY': [],
				'CLAIM_CODE': [],
				'CLAIM_CATEGORY': [],
				'PAY_COMPONENT': [],
				'COMPANY_CLAIM_CATEGORY': [],
				'CLINIC_MASTER': [],
				'PERSONAL_AREA': [],
				'PERSONAL_SUB_AREA': [],
				'SPONSOR_SPL': [],
				'SPECIALISATION': [],
				'DEPARTMENT': [],
				'DIVISION': [],
				'CLAIM_ADMIN': [],
				'LOCATION': []
			},
			table_Name = [{
				db: Company_Master,
				name: "COMPANY"
			}, {
				db: Claim_Code,
				name: "CLAIM_CODE"
			}, {
				db: Claim_Category,
				name: "CLAIM_CATEGORY"
			}, {
				db: Claim_Paycomponent,
				name: "PAY_COMPONENT"
			}, {
				db: Company_Claim_Category,
				name: "COMPANY_CLAIM_CATEGORY"
			}, {
				db: Claim_Clinic,
				name: "CLINIC_MASTER"
			}, {
				db: Claim_Pa,
				name: "PERSONAL_AREA"
			}, {
				db: Claim_PSA,
				name: "PERSONAL_SUB_AREA"
			}, {
				db: Claim_Sponsor,
				name: "SPONSOR_SPL"
			}, {
				db: Claim_Specialisation,
				name: "SPECIALISATION"
			}, {
				db: Claim_Department,
				name: "DEPARTMENT"
			}, {
				db: Claim_Division,
				name: "DIVISION"
			}, {
				db: Claim_Admin,
				name: "CLAIM_ADMIN"
			}, {
				db: Claim_Admin,
				name: "CLAIM_ADMIN"
			}, {
				db: BEN_LOCATION,
				name: "LOCATION"
			}];
		var promiseUserAll = [];
		var returnBody = {};

		// promiseUserAll.push(tableDropDownFetch(tx, table_Name, body));
		// var FinalReturn = Promise.all(promiseUserAll).then(async(values) => {
		// 	values.forEach(dropdetails => {
		// 		returnBody = dropdetails;
		// 	})
		// 	return JSON.stringify(returnBody);
		// });
		var FinalReturn = await tableDropDownFetch(tx, table_Name, body);
		return JSON.stringify(FinalReturn);
	});

	async function tableDropDownFetch(tx, table_Name, body) {
		for (const table of table_Name) {
			var tableData = await tx.run(
				SELECT.from(table.db));
			if (tableData.length == 0) {
				body[table.name] = [];
			} else {
				body[table.name] = tableData;
			}
		}
		return body;
	};

	async function deleteTableEntries(tx, deletionValues, Entries) {
		var deletefailure = [];
		for (const entry of Entries) {
			var filterObject = {};
			var ketEntries = deletionValues.table_key;
			for (var i = 0; i < ketEntries.length; i++) {
				filterObject[ketEntries[i]] = entry[ketEntries[i]]

			}
			var deletedValue = await tx.run(DELETE.from(deletionValues.table_Name).where(filterObject));
			if (deletedValue == 0) {
				deletefailure.push(entry);
			}
		}
		return deletefailure;
	};
	// async function deleteTableWithLineItems(tx, table_Name, Entries, table_Name_string) {
	// 	var deletefailure = [],
	// 		table_LineItem;
	// 	if (table_Name_string == "WRC_MASTER_CLAIM") {
	// 		table_LineItem = WRC_LINEITEM_CLAIM
	// 	} else if (table_Name_string == "WRC_HR_MASTER_CLAIM") {
	// 		table_LineItem = WRC_HR_LINEITEM_CLAIM
	// 	}
	// 	for (const entry of Entries) {
	// 		if (entry.LINE_ITEM.length != 0) {
	// 			var deleteLineItems = await deleteTableEntries(tx, table_LineItem, entry.LINE_ITEM);
	// 			if (deleteLineItems.length != 0) {
	// 				deletefailure.concat(deleteLineItems);
	// 			}
	// 		}
	// 		delete entry.LINE_ITEM;
	// 		var deletedValue = await tx.run(DELETE.from(table_Name).where(entry));
	// 		if (deletedValue == 0) {
	// 			deletefailure.push(entry);
	// 		}
	// 	}
	// 	return deletefailure;
	// };

	function getTableKeyEntries(table_Name) {
		var tableKeys = {
			approval: {
				db: approval,
				entries: ["CLAIM_REFERENCE"],
				allowDelete: ""
			},
			approval_structure: {
				db: approval_structure,
				entries: ["Claim_code", "Sequence_of_check"],
				allowDelete: "X"
			},
			approval_structure_hr: {
				db: approval_structure_hr,
				entries: ["Claim_code", "Sequence_of_check"],
				allowDelete: "X"
			},
			Benefit_Claim_Admin: {
				db: Benefit_Claim_Admin,
				entries: ["Start_Date", "End_Date", "Company", "Claim_Category", "Claim_Code"],
				allowDelete: ""
			},
			Claim_Admin: {
				db: Claim_Admin,
				entries: ["Claim_Code"],
				allowDelete: ""
			},
			Claim_Category: {
				db: Claim_Category,
				entries: ["Company", "Category_Code"],
				allowDelete: ""
			},
			Claim_Clinic: {
				db: Claim_Clinic,
				entries: ["Company", "Clinic_Code"],
				allowDelete: ""
			},
			Claim_Code: {
				db: Claim_Code,
				entries: ["Claim_code", "Company"],
				allowDelete: ""
			},
			Claim_Department: {
				db: Claim_Department,
				entries: ["Company", "Department_Code"],
				allowDelete: ""
			},
			Claim_Division: {
				db: Claim_Division,
				entries: ["Company", "Division_Code"],
				allowDelete: ""
			},
			Claim_Pa: {
				db: Claim_Pa,
				entries: ["Company", "Personal_Area"],
				allowDelete: ""
			},
			Claim_Paycomponent: {
				db: Claim_Paycomponent,
				entries: ["Company", "PayComponent_ID"],
				allowDelete: ""
			},
			Claim_Pay_Grade: {
				db: Claim_Pay_Grade,
				entries: ["Company", "PayGrade_ID"],
				allowDelete: ""
			},
			Claim_PSA: {
				db: Claim_PSA,
				entries: ["Company", "Personal_Sub_Area"],
				allowDelete: ""
			},
			Claim_Specialisation: {
				db: Claim_Specialisation,
				entries: ["Company", "Special_Code"],
				allowDelete: ""
			},
			Claim_Sponsor: {
				db: Claim_Sponsor,
				entries: ["Company", "Sponsor_Code"],
				allowDelete: ""
			},
			Claim_Status: {
				db: Claim_Status,
				entries: ["Employee_Id", "Claim_Reference"],
				allowDelete: ""
			},
			Company_Claim_Category: {
				db: Company_Claim_Category,
				entries: ["Claim_code", "Company", "Category_Code"],
				allowDelete: ""
			},
			Company_Master: {
				db: Company_Master,
				entries: ["Company"],
				allowDelete: ""
			},
			Demo_Hana: {
				db: Demo_Hana,
				entries: ["ID"],
				allowDelete: ""
			},
			overtime_claim: {
				db: overtime_claim,
				entries: ["EMPLOYEE_ID", "CLAIM_CODE", "CLAIM_REFERENCE", "CLAIM_DATE"],
				allowDelete: "X"
			},
			Benefit_Eligibility: {
				db: Benefit_Eligibility,
				entries: ["Sequence", "Effective_Date", "End_Date", "Claim_Code"],
				allowDelete: ""
			},
			Co_Payment: {
				db: Co_Payment,
				entries: ["Claim_Code", "Clinic", "Med_Leave_Declar", "AL_Exceeded"],
				allowDelete: "X"
			},
			EMPLOYEE_MASTER: {
				db: EMPLOYEE_MASTER,
				entries: ["USERID"],
				allowDelete: ""
			},
			Medical_Claim: {
				db: Medical_Claim,
				entries: ["EMPLOYEE_ID", "CLAIM_CODE", "CLAIM_REFERENCE", "CLAIM_DATE"],
				allowDelete: "X"
			},
			CPR_CLAIM: {
				db: CPR_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_CODE", "CLAIM_REFERENCE", "CLAIM_DATE"],
				allowDelete: "X"
			},
			WRC_HR_LINEITEM_CLAIM: {
				db: WRC_HR_LINEITEM_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "LINE_ITEM_REFERENCE_NUMBER", "CLAIM_CODE", "CLAIM_CATEGORY", "CLAIM_DATE"],
				allowDelete: "X"
			},
			WRC_HR_MASTER_CLAIM: {
				db: WRC_HR_MASTER_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			WRC_MASTER_CLAIM: {
				db: WRC_MASTER_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			WRC_LINEITEM_CLAIM: {
				db: WRC_LINEITEM_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "LINE_ITEM_REFERENCE_NUMBER", "CLAIM_CODE", "CLAIM_CATEGORY", "CLAIM_DATE"],
				allowDelete: "X"
			},
			Location_RO: {
				db: Location_RO,
				entries: ["DEPARTMENT", "DIVISION", "Location_RO_EmployeeID"],
				allowDelete: "X"
			},
			TC_MASTER_CLAIM: {
				db: TC_MASTER_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			TC_LINEITEM_CLAIM: {
				db: TC_LINEITEM_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "LINE_ITEM_REFERENCE_NUMBER", "CLAIM_CODE", "CLAIM_CATEGORY", "CLAIM_DATE"],
				allowDelete: "X"
			},
			COV_MASTER_CLAIM: {
				db: COV_MASTER_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			COV_LINEITEM_CLAIM: {
				db: COV_LINEITEM_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "LINE_ITEM_REFERENCE_NUMBER", "CLAIM_CODE", "CLAIM_CATEGORY", "CLAIM_DATE"],
				allowDelete: "X"
			},
			PC_CLAIM: {
				db: PC_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			PTF_ACL_BCL_CLAIM: {
				db: PTF_ACL_BCL_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			SP_MASTER_CLAIM: {
				db: SP_MASTER_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			SP_LINEITEM_CLAIM: {
				db: SP_LINEITEM_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "LINE_ITEM_REFERENCE_NUMBER", "CLAIM_CODE", "CLAIM_CATEGORY", "CLAIM_DATE"],
				allowDelete: "X"
			},
			SP1_MASTER_CLAIM: {
				db: SP1_MASTER_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			SP1_LINEITEM_CLAIM: {
				db: SP1_LINEITEM_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "LINE_ITEM_REFERENCE_NUMBER", "CLAIM_CODE", "CLAIM_CATEGORY", "CLAIM_DATE"],
				allowDelete: "X"
			},
			SP2_MASTER_CLAIM: {
				db: SP2_MASTER_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			SP2_LINEITEM_CLAIM: {
				db: SP2_LINEITEM_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "LINE_ITEM_REFERENCE_NUMBER", "CLAIM_CODE", "CLAIM_CATEGORY", "CLAIM_DATE"],
				allowDelete: "X"
			},
			SP3_MASTER_CLAIM: {
				db: SP3_MASTER_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			SP3_LINEITEM_CLAIM: {
				db: SP3_LINEITEM_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "LINE_ITEM_REFERENCE_NUMBER", "CLAIM_CODE", "CLAIM_CATEGORY", "CLAIM_DATE"],
				allowDelete: "X"
			},
			SDFC_MASTER_CLAIM: {
				db: SDFC_MASTER_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			SDFC_LINEITEM_CLAIM: {
				db: SDFC_LINEITEM_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "LINE_ITEM_REFERENCE_NUMBER", "CLAIM_CODE", "CLAIM_CATEGORY", "CLAIM_DATE"],
				allowDelete: "X"
			},
			SDFR_MASTER_CLAIM: {
				db: SDFR_MASTER_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			SDFR_LINEITEM_CLAIM: {
				db: SDFR_LINEITEM_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "LINE_ITEM_REFERENCE_NUMBER", "CLAIM_CODE", "CLAIM_CATEGORY", "CLAIM_DATE"],
				allowDelete: "X"
			},
			CPC_MASTER_CLAIM: {
				db: CPC_MASTER_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			CPC_LINEITEM_CLAIM: {
				db: CPC_LINEITEM_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "LINE_ITEM_REFERENCE_NUMBER", "CLAIM_CODE", "CLAIM_CATEGORY", "CLAIM_DATE"],
				allowDelete: "X"
			},
			OC_MASTER_CLAIM: {
				db: OC_MASTER_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			OC_LINEITEM_CLAIM: {
				db: OC_LINEITEM_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "LINE_ITEM_REFERENCE_NUMBER", "CLAIM_CODE", "CLAIM_CATEGORY", "CLAIM_DATE"],
				allowDelete: "X"
			},
			PAY_UP_MASTER_CLAIM: {
				db: PAY_UP_MASTER_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "CLAIM_DATE", "CLAIM_CATEGORY"],
				allowDelete: "X"
			},
			PAY_UP_LINEITEM_CLAIM: {
				db: PAY_UP_LINEITEM_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_REFERENCE", "LINE_ITEM_REFERENCE_NUMBER", "CLAIM_CODE", "CLAIM_CATEGORY", "CLAIM_DATE"],
				allowDelete: "X"
			},
			AHP_LIC_MS_WIC_CLAIM: {
				db: AHP_LIC_MS_WIC_CLAIM,
				entries: ["EMPLOYEE_ID", "CLAIM_CODE", "CLAIM_REFERENCE", "CLAIM_DATE"],
				allowDelete: "X"
			},
			DELEGATOR: {
				db: DELEGATOR,
				entries: ["START_DATE", "END_DATE", "DELEGATOR_ID", "APPROVER_ID"],
				allowDelete: "X"
			},
			Benefit_Entitlement_Adjust: {
				db: Benefit_Entitlement_Adjust,
				entries: ["emp_Id", "Year", "Claim_code"],
				allowDelete: "X"
			},
			BEN_LOCATION: {
				db: BEN_LOCATION,
				entries: ["START_DATE", "LOCATION"],
				allowDelete: "X"
			},
			WRC_CLAIM_TYPE: {
				db: WRC_CLAIM_TYPE,
				entries: ["WRC_CLAIM_TYPE_ID"],
				allowDelete: "X"
			},
			claimPostingCutoff: {
				db: claimPostingCutoff,
				entries: ["company", "payrollPeriod"],
				allowDelete: "X"
			},
			Benefit_Transport_Amount: {
				db: Benefit_Transport_Amount,
				entries: ["DIVISION_FROM", "DIVISION_TO", "VEHICLE_CODE"],
				allowDelete: "X"
			},
			CLAIM_COORDINATOR: {
				db: CLAIM_COORDINATOR,
				entries: ["ID"],
				allowDelete: "X"
			},
			ADMIN_ROLE: {
				db: ADMIN_ROLE,
				entries: ["EMPLOYEE_ID", "START_DATE", "END_DATE"],
				allowDelete: "X"
			},
			GL_MAPPING: {
				db: GL_MAPPING,
				entries: ["START_DATE", "END_DATE", "GL_ACC"],
				allowDelete: "X"
			},
			VENDOR: {
				db: GL_MAPPING,
				entries: ["START_DATE", "END_DATE", "VENDOR_CODE"],
				allowDelete: "X"
			},
			CURRENCY: {
				db: CURRENCY,
				entries: ["START_DATE", "END_DATE", "CURRENCY"],
				allowDelete: "X"
			},
			ADMIN_TILE_LIST:{
				db: ADMIN_TILE_LIST,
				entries: ["TILE_CODE"],
				allowDelete: "X"
			},
			VEHICLE_RATE:{
				db: VEHICLE_RATE,
				entries: ["START_DATE","END_DATE","TRANSPORT_TYPE"],
				allowDelete: "X"
			}
		}
		return {
			table_Name: tableKeys[table_Name].db,
			table_key: tableKeys[table_Name].entries,
			allowDelete: tableKeys[table_Name].allowDelete
		};
	};

	async function executeDeleteProcess(req) {

		let tx = cds.transaction(req),
			promiseUserAll = [],
			Message = [];
		let table_Name = req.data.table_Name;
		let payloadArray = JSON.parse(req.data.deleteItems);
		var deletionValues = getTableKeyEntries(table_Name);
		if (deletionValues.allowDelete != "X" && !req.user.is('zadmin')) {
			return req.error(404, 'Access to Delete is forbidden')
		}
		// if (table_Name == "WRC_MASTER_CLAIM" || table_Name == "WRC_HR_MASTER_CLAIM") {
		// 	var FinalReturn = await deleteTableWithLineItems(tx, deletionValues.table_Name, payloadArray, table_Name)
		// } else {
		var FinalReturn = await deleteTableEntries(tx, deletionValues, payloadArray)
			// }

		return FinalReturn;
	};
	srv.on('deleteGeneral', async(req) => {
		try {
			var FinalReturn = await executeDeleteProcess(req);
			if (FinalReturn.length != 0) {
				//return req.error(404, 'The following entries were not deleted successfully: ' + JSON.stringify(FinalReturn))
				return req.error(404, 'Failed to delete draft claim')
			} else {
				return "The selected entries have been Deleted successfully"
			}
		} catch (error) {
			console.log(error);
		}
	});

	function getDayforDate(claimDate) {
		var weekday = new Array(7);
		weekday[0] = "Sunday";
		weekday[1] = "Monday";
		weekday[2] = "Tuesday";
		weekday[3] = "Wednesday";
		weekday[4] = "Thursday";
		weekday[5] = "Friday";
		weekday[6] = "Saturday";
		var dateParts = claimDate.split("-");
		var date = parseInt(dateParts[2]);
		var month = parseInt(dateParts[1]) - 1;
		var year = parseInt(dateParts[0]);
		var createDateFormat = new Date(year, month, date);
		return weekday[createDateFormat.getDay()];

	};
	srv.before(['UPDATE', 'CREATE'], 'overtime_claim', async(req) => {
		var claimCode = req.data.CLAIM_CODE;
		var claimDay = getDayforDate(req.data.CLAIM_DATE);

		// console.log(`Project id: ${projectId}`);
		if (claimCode == "TSOTC_REST" && claimDay != "Sunday") {
			req.reject(400, 'Overtime Claim (Rest Day) must be on a Sunday');
		}
	});

	/* Not required! Validation moved to generic service "validateClaimSubmission"
	srv.before(['CREATE'], 'Medical_Claim', async(req) => {
		var ReceiptNumber = req.data.RECEIPT_NUMBER;
		var employeeId = req.data.EMPLOYEE_ID;
		const tx = cds.transaction(req);

		const receiptNumberAvailable = await tx.run(
			SELECT.from(Medical_Claim).where({
				RECEIPT_NUMBER: ReceiptNumber,
				EMPLOYEE_ID: employeeId,
				CLAIM_STATUS: {
					'!=': 'Rejected'
				}
			})
		);
		// console.log(`Project id: ${projectId}`);
		if (receiptNumberAvailable != 0) {
			req.reject(400, "Claim with Receipt Number " + ReceiptNumber + " already available for Employee " + employeeId);
		}
	});*/

	srv.before(['CREATE'], 'Benefit_Claim_Admin', async(req) => {
		var Company = req.data.Company;
		var Claim_Code = req.data.Claim_Code;
		var Claim_Category = req.data.Claim_Category;
		var Start_Date = req.data.Start_Date;
		var End_Date = req.data.End_Date;
		// console.log("Start_Date",req.data.Start_Date);

		// console.log("Start_Date" , new Date(req.data.Start_Date));
		// console.log("End_Date" , new Date(req.data.End_Date));

		const tx = cds.transaction(req);

		const receiptNumberAvailable = await tx.run(
			SELECT.from(Benefit_Claim_Admin).where({
				Company: Company,
				Claim_Code: Claim_Code,
				Claim_Category: Claim_Category,
				Start_Date: {
					'<=': Start_Date
				},
				End_Date: {
					'>=': Start_Date
				}
				// End_Date: { '<=' : End_Date }
			})
		);
		// const receiptNumberAvailable1 = [];
		const receiptNumberAvailable1 = await tx.run(
			SELECT.from(Benefit_Claim_Admin).where({
				Company: Company,
				Claim_Code: Claim_Code,
				Claim_Category: Claim_Category,
				Start_Date: {
					'<=': End_Date
				},
				End_Date: {
					'>=': End_Date
				}
				// End_Date: { '<=' : End_Date }
			})
		);
		// console.log("Start_Date" , receiptNumberAvailable1.length,receiptNumberAvailable.length);
		// console.log("Start_Date" , receiptNumberAvailable1,receiptNumberAvailable);
		if (receiptNumberAvailable.length > 0 || receiptNumberAvailable1.length > 0) {
			req.reject(400, "Overlapping entries are not allowed");
		}
	});

	// srv.on('submitForApproval', async(req) => {
	// 	var listofClaims = JSON.parse(req.data.listofClaims);
	// 	var tableName = req.data.table_Name;
	// 	const tx = cds.transaction(req);
	// 	//for local testing below condition
	// 	if (req.user.id.match("@") == null) {
	// 		var EmailId = "tvinothkumar@abeam.com";
	// 	} else {
	// 		var EmailId = req.user.id;
	// 	}
	// 	var employeeDetails = await tx.run(SELECT.from(masterandLocation).where({
	// 		"EMAIL": EmailId
	// 	}));
	// 	console.log(req.user);
	// 	//Below Are working code for reference
	// 	// var employeeDetails=await cds.tx(req).run('SELECT h.DIVISION,h.DEPARTMENT,r.LOCATION_RO_EMPLOYEEID,h.EMAIL FROM BENEFIT_EMPLOYEE_MASTER  h '+
	// 	// 'JOIN BENEFIT_LOCATION_RO r on r.DIVISION = h.DIVISION')

	// 	// var employeeDetails = await cds.run(SELECT.from('BENEFIT_EMPLOYEE_MASTER').columns([
	// 	// 	                                  'BENEFIT_EMPLOYEE_MASTER.DIVISION',
	// 	// 	                                  'BENEFIT_EMPLOYEE_MASTER.DEPARTMENT',
	// 	// 	                                  'benefit.Location_RO.LOCATION_RO_EMPLOYEEID'
	// 	// 	                          ])
	// 	// 	.join('BENEFIT_LOCATION_RO')
	// 	// 	.on('BENEFIT_EMPLOYEE_MASTER.DEPARTMENT', '=', 'BENEFIT_LOCATION_RO.DEPARTMENT').and('BENEFIT_EMPLOYEE_MASTER.DIVISION', '=',
	// 	// 		'BENEFIT_LOCATION_RO.DIVISION'));
	// 	// await SELECT.from (Authors)

	// 	var Approver = employeeDetails[0].ApproverID;
	// 	var ApproverName = employeeDetails[0].ApproverName;
	// 	var claimTable = getTableKeyEntries(tableName);
	// 	var filterKey = {},
	// 		claimStatusEntries = [],
	// 		ApprovalTableEntries = [],
	// 		ApprovalStructureEntries = [];

	// 	for (const claim of listofClaims) {
	// 		for (const key of claimTable.table_key) {
	// 			filterKey[key] = claim[key];
	// 		}
	// 		var update = await tx.run(UPDATE(claimTable.table_Name).set({
	// 			CLAIM_STATUS: "Pending for Approval",
	// 			SUBMITTED_ON: new Date().toISOString().substring(0, 10),
	// 			SUBMITTED_BY: claim.EMPLOYEE_ID
	// 		}).where(filterKey));
	// 		if (update != 0) {
	// 			claimStatusEntries.push({
	// 				Employee_Id: claim.EMPLOYEE_ID, //key
	// 				Claim_Reference: claim.CLAIM_REFERENCE, //key
	// 				Submit_Date: new Date().toISOString().substring(0, 10),
	// 				Status: "Pending for Approval",
	// 				Owner: claim.EMPLOYEE_ID,
	// 				Total_Level: "1",
	// 				Current_Level: "1",
	// 				Approver1: Approver
	// 			});
	// 			ApprovalTableEntries.push({
	// 				Claim_Reference: claim.CLAIM_REFERENCE, //key
	// 				Employee_ID: Approver,
	// 				Employee_Name: ApproverName,
	// 				Claim_Date: claim.CLAIM_DATE,
	// 				Amount: claim.CLAIM_AMOUNT,
	// 				Claim_Status: "Pending for Approval",
	// 				Category_Code: claim.CLAIM_CATEGORY,
	// 				Claim_Owner_id: claim.EMPLOYEE_ID
	// 			});

	// 		} else {
	// 			req.error("404", "There no entry available with Claim Reference No: " + claim.CLAIM_REFERENCE);
	// 		}
	// 	}
	// 	try {
	// 		var claimStatusUpdate = await tx.run(INSERT.into(Claim_Status).entries(claimStatusEntries));
	// 		if (claimStatusUpdate != 0) {
	// 			var approvalTable = await tx.run(INSERT.into(approval).entries(ApprovalTableEntries));
	// 			if (approvalTable != 0) {
	// 				return "The Approval has been Submitted Succesfully";
	// 				// var approvalStructure = await tx.run(INSERT.into(approval_structure).entires(ApprovalStructureEntries));
	// 				// if (approvalStructure != 0) {
	// 				// 	return "The Approval has been Submitted Succesfully"
	// 				// }
	// 			} else {
	// 				req.error("404", "The Approval Status Table Insert has Failed")
	// 			}
	// 		} else {
	// 			req.error("404", "The Claim Status Table Insert has Failed")
	// 		}
	// 	} catch (error) {
	// 		// return JSON.stringify(employeeDetails);
	// 		return req.error(
	// 			404,
	// 			"Failed to insert in Claim Status and Approval Table" + error
	// 		);
	// 	}
	// });

	// srv.on('claimApprovalOrReject', async(req) => {
	// 	var listofClaims = JSON.parse(req.data.listofClaims);
	// 	// var tableName = req.data.table_Name,
	// 	var errorList = [];
	// 	const tx = cds.transaction(req);

	// 	for (const claim of listofClaims) {

	// 		var filterKeyandTable = functionfetchFiltersandTableClaim(claim);
	// 		var updateMasterClaim = await tx.run(UPDATE(filterKeyandTable.table_Name).set({
	// 			CLAIM_STATUS: claim.Claim_Status
	// 		}).where(filterKeyandTable.filterKey));
	// 		if (updateMasterClaim != 0) {
	// 			var updateClaimStatus = await tx.run(UPDATE(Claim_Status).set({
	// 				Status: claim.Claim_Status,
	// 				Response_Date: new Date().toISOString().substring(0, 10),
	// 			}).where({
	// 				Employee_Id: claim.Claim_Owner_id,
	// 				Claim_Reference: claim.Claim_Reference
	// 			}));

	// 			if (updateClaimStatus != 0) {
	// 				var updateApprovalTable = await tx.run(UPDATE(approval).set({
	// 					Claim_Status: claim.Claim_Status
	// 				}).where({
	// 					Claim_Reference: claim.Claim_Reference
	// 				}));
	// 				if (updateApprovalTable != 0) {
	// 					//any code
	// 				} else {
	// 					errorList.push(claim);
	// 					console.log("Approval Table update failed")
	// 				}

	// 			} else {
	// 				errorList.push(claim);
	// 				console.log(" claim status update failed")
	// 			}
	// 		} else {
	// 			errorList.push(claim);
	// 			console.log(" WRC CLim update failed")
	// 		}
	// 	}

	// 	if (errorList.length == 0) {
	// 		return "The claim with reference ID has been Approved Succesfully"
	// 	} else {
	// 		req.error("404", "The following Claim Approval failes" + JSON.stringify(errorList));
	// 	}

	// });

	function functionfetchFiltersClaim(claim) {
		if (claim.Category_Code == "WRC" || claim.Category_Code == "WRC_HR") {
			var tableNameString = claim.Category_Code + "_MASTER_CLAIM";
		} else {
			var tableNameString = claim.Category_Code + "_CLAIM";
		}

		var tableName_Keys = getTableKeyEntries(tableNameString)
		tableName_Keys.filterKey = {};
		if (tableNameString == "WRC_MASTER_CLAIM") {
			tableName_Keys.filterKey['EMPLOYEE_ID'] = claim.Claim_Owner_id;
			tableName_Keys.filterKey['CLAIM_REFERENCE'] = claim.Claim_Reference;
			tableName_Keys.filterKey['CLAIM_DATE'] = claim.Claim_Date;
			tableName_Keys.filterKey['CLAIM_CATEGORY'] = claim.Category_Code;
		}

		return tableName_Keys;
	}

	srv.on('submitForApproval', async(req) => {

		try {
			var listofClaims = JSON.parse(req.data.listofClaims);
			var tableName = req.data.table_Name;
			var sp, output, approvalData = [];
			// var userid = JSON.parse(req.data.input1);
			// var array = ["1"];
			// var mapped = array.map((data) => {
			// 	return {
			// 		input1: data
			// 	};
			// })
			// var query = SELECT.from(claimApproverView);
			// var output = await cds.run(query, mapped);
			// console.log(output)
			// return true

			console.log(tableName);

			listofClaims.forEach(items => {
				approvalData.push({
					"EMPLOYEE_ID": items.EMPLOYEE_ID,
					"CLAIM_CODE": items.CLAIM_CODE == undefined || null ? items.CATEGORY_CODE : items.CLAIM_CODE,
					"CLAIM_REFERENCE": items.CLAIM_REFERENCE,
					"CLAIM_TYPE": items.CLAIM_TYPE,
					"CLAIM_DATE": items.CLAIM_DATE,
					"CATEGORY_CODE": items.CATEGORY_CODE,
					"CLAIM_AMOUNT": items.CLAIM_AMOUNT,
					"CLAIM_CATEGORY": items.CLAIM_CATEGORY,
					"SUBMITTED_BY": items.SUBMITTED_BY,
					"BEHALF_FLAG": items.BEHALF_FLAG,
					"FIRST_LEVEL_APPROVER": items.FIRST_LEVEL_APPROVER,
					"RECEIPT_DATE": items.RECEIPT_DATE == undefined || null ? items.CLAIM_DATE : items.RECEIPT_DATE,
					"REMARKS_EMPLOYEE": items.REMARKS_EMPLOYEE
				})
			});

			var Claim_Categorty = approvalData[0].CATEGORY_CODE;
			var Claim_owner = approvalData[0].EMPLOYEE_ID;

			let dbConn = new dbClass(await dbClass.createConnection(db.options.credentials))
			sp = await dbConn.loadProcedurePromisified(hdbext, null, 'claimApprovalStructure');
			output = await dbConn.callProcedurePromisified(sp, [approvalData, Claim_Categorty, Claim_owner, '']);
			// if (tableName == "BENEFIT_MEDICAL_CLAIM") {
			// 	sp = await dbConn.loadProcedurePromisified(hdbext, null, 'proc_medical_claim_submit');
			// 	output = await dbConn.callProcedurePromisified(sp, listofClaims);

			// } else if (tableName == "BENEFIT_WRC_MASTER_CLAIM") {
			// 	sp = await dbConn.loadProcedurePromisified(hdbext, null, 'proc_wrc_submit');
			// 	output = await dbConn.callProcedurePromisified(sp, listofClaims);
			// } else if (tableName == "BENEFIT_OVERTIME_CLAIM") {
			// 	sp = await dbConn.loadProcedurePromisified(hdbext, null, 'proc_overtime_claim_submit');
			// 	output = await dbConn.callProcedurePromisified(sp, listofClaims);
			// } else if (tableName == "BENEFIT_WRC_HR_MASTER_CLAIM") {
			// 	sp = await dbConn.loadProcedurePromisified(hdbext, null, 'proc_wrc_hr_submit');
			// 	output = await dbConn.callProcedurePromisified(sp, listofClaims);
			// }
			console.log(output);
			return output;

			//         const tx = cds.transaction(req)
			// var vProcedure = 'call claimApprovalStructure(RESULT => ?)'
			// return tx.run (vProcedure)	

		} catch (error) {
			console.error(error)
				// return false
		}
	});

	srv.on("cancelApproval", async(req) => {
		try {
			const tx = cds.transaction(req);
			// const txLog = cds.transaction(req);
			var listofClaims = JSON.parse(req.data.listofClaims);
			var tableName = req.data.table_Name;
			var sp, output, lineItemUpdate = [];

			var LineItems = listofClaims.LINE_ITEM;

			let claimNewForApproveSQL =
				`SELECT  CS."STATUS"
	                FROM "BENEFIT_CLAIM_STATUS" CS
	                INNER JOIN "BENEFIT_CLAIM_CANCEL_MASTER" CM
	                ON CM."PARENT_EMPLOYEE_ID"= '${listofClaims.EMPLOYEE_ID}'
	                AND CM."PARENT_CLAIM_REFERENCE"= '${listofClaims.CLAIM_REFERENCE}'
	                AND CS."CLAIM_REFERENCE" = CM."CLAIM_REFERENCE"`;

			let claimNewForApprov = await tx.run(claimNewForApproveSQL);
			var claimCancelledinProgress = claimNewForApprov.filter(checkStatusofCancellation)

			function checkStatusofCancellation(rows) {
				return (rows.STATUS != 'Rejected' && rows.STATUS != 'Cancelled' && rows.STATUS != 'Cancellation Approved');
			}

			// var claimNewForApprove = await tx.run(SELECT.from(CLAIM_CANCEL_MASTER).where({
			// 	PARENT_EMPLOYEE_ID: listofClaims.EMPLOYEE_ID,
			// 	PARENT_CLAIM_REFERENCE: listofClaims.CLAIM_REFERENCE
			// }));
			if (listofClaims.CLAIM_STATUS == "Approved" && claimCancelledinProgress.length != 0 && (LineItems == undefined || LineItems == null ||
					LineItems.length == 0)) {
				if (listofClaims.CLAIM_STATUS == "Approved" && claimCancelledinProgress.length != 0 && (LineItems == undefined || LineItems == null)) {
					return req.reject({
						code: '400',
						message: "Failed to create cancellation request as already a request is in progress " + listofClaims.CLAIM_REFERENCE
					})
				} else if (LineItems.length == 0) {
					return req.reject({
						code: '400',
						message: "Failed to create cancellation request as already Cancellation Requests for all the items under " + listofClaims.CLAIM_REFERENCE +
							" has been created"
					})
				}
			} else {
				delete listofClaims.LINE_ITEM;
				var oldClaim_Reference = listofClaims.CLAIM_REFERENCE;
				//Create a Copy of the original Claim
				listofClaims.CLAIM_REFERENCE = listofClaims.CATEGORY_CODE + new Date().getTime().toString();
				var tableNameKey = getTableKeyEntries(tableName);
				var Claim_Categorty = listofClaims.CATEGORY_CODE;
				var Claim_owner = listofClaims.EMPLOYEE_ID;
				listofClaims.CLAIM_STATUS = "Cancellation Pending for approval, Level 1";
				var claimNewForApprove = await tx.run(INSERT.into(tableNameKey.table_Name).entries(listofClaims));
				listofClaims.CLAIM_STATUS = "Approved";
				// await tx.commit();

				if (claimNewForApprove.length != 0) {
					if (LineItems != undefined && LineItems != null) {
						var tableLineitem = tableName.split("MASTER").join('LINEITEM');
						var tableLineKey = getTableKeyEntries(tableLineitem);
						for (let index in LineItems) {
							LineItems[index].PARENT_CLAIM_REFERENCE = listofClaims.CLAIM_REFERENCE;
							var items = LineItems[index];
							//Update Parent Reference Line Item 
							var updateLine = await tx.run(UPDATE(tableLineKey.table_Name).set({
								PARENT_CLAIM_REFERENCE: listofClaims.CLAIM_REFERENCE
							}).where({
								CLAIM_REFERENCE: items.CLAIM_REFERENCE
							}));
							// await tx.commit();
							if (updateLine.length = 0) {
								lineItemUpdate.push[LineItems[index].CLAIM_REFERENCE];
							}
						}
					}
					// LineItems.forEach(async(items, index) => {
					// 	LineItems[index].PARENT_CLAIM_REFERENCE = listofClaims.CLAIM_REFERENCE;
					// 	//Update Parent Reference Line Item 
					// 	var updateLine = await tx.run(UPDATE(tableLineKey.table_Name).set({
					// 		PARENT_CLAIM_REFERENCE: listofClaims.CLAIM_REFERENCE
					// 	}).where({
					// 		CLAIM_REFERENCE: items.CLAIM_REFERENCE
					// 	}));
					// 	// await tx.commit();
					// 	if (updateLine.length = 0) {
					// 		lineItemUpdate.push[LineItems[index].CLAIM_REFERENCE];
					// 	}
					// })
				} else {
					return req.reject({
						code: '400',
						message: "Cancellation request failed"
					})
				}
				if (lineItemUpdate.length > 0) {
					return req.reject({
						code: '400',
						message: "The following Line Item Update Failed " + lineItemUpdate.join()
					})
				} else {
					var entries = [];
					entries.push({
						EMPLOYEE_ID: listofClaims.EMPLOYEE_ID,
						CLAIM_REFERENCE: listofClaims.CLAIM_REFERENCE,
						CLAIM_DATE: listofClaims.CLAIM_DATE,
						CLAIM_CATEGORY: listofClaims.CLAIM_CATEGORY,
						PARENT_EMPLOYEE_ID: listofClaims.EMPLOYEE_ID,
						PARENT_CLAIM_REFERENCE: oldClaim_Reference
					})
					var cancelclaim = await tx.run(INSERT.into(CLAIM_CANCEL_MASTER).entries(entries));
					if (cancelclaim != 0) {
						await tx.commit();
						var claimEntries = [{
							"EMPLOYEE_ID": listofClaims.EMPLOYEE_ID,
							"CLAIM_CODE": listofClaims.CLAIM_CODE == undefined || null ? listofClaims.CATEGORY_CODE : listofClaims.CLAIM_CODE,
							"CLAIM_REFERENCE": listofClaims.CLAIM_REFERENCE,
							"CLAIM_TYPE": listofClaims.CLAIM_TYPE,
							"CLAIM_DATE": listofClaims.CLAIM_DATE,
							"CATEGORY_CODE": listofClaims.CATEGORY_CODE,
							"CLAIM_AMOUNT": listofClaims.CLAIM_AMOUNT,
							"CLAIM_CATEGORY": listofClaims.CLAIM_CATEGORY,
							"SUBMITTED_BY": listofClaims.SUBMITTED_BY,
							"BEHALF_FLAG": listofClaims.BEHALF_FLAG,
							"FIRST_LEVEL_APPROVER": listofClaims.FIRST_LEVEL_APPROVER,
							"RECEIPT_DATE": listofClaims.RECEIPT_DATE == undefined || null ? listofClaims.CLAIM_DATE : listofClaims.RECEIPT_DATE,
							"REMARKS_EMPLOYEE": listofClaims.REMARKS_EMPLOYEE
						}]
						await tx.begin();
						let dbConn = new dbClass(await dbClass.createConnection(db.options.credentials))
						sp = await dbConn.loadProcedurePromisified(hdbext, null, 'claimApprovalStructure')
						output = await dbConn.callProcedurePromisified(sp, [
							claimEntries, Claim_Categorty, Claim_owner, 'CANCEL'
						]);
						console.log(output);
						return "Cancellation Request for the Claim " + oldClaim_Reference + " has been raised and the new reference number is " +
							listofClaims.CLAIM_REFERENCE;

					} else {
						return req.reject({
							code: '400',
							message: "Failed to create cancellation request for  " + oldClaim_Reference
						})
					}

					//After closing Request Need to Begin a Transaction
					//	await tx.begin();

				}
			}
		} catch (error) {
			console.error(error)
				// return false
		}

	});

	srv.on('sendEmailNotification', async(req) => {
		const tx = cds.transaction(req);
		const requestData = req.data;
		if (!requestData.CLAIM_REFERENCE || !requestData.CLAIM_STATUS || !requestData.CATEGORY_CODE) {
			console.log("Please provide necessary details: CLAIM_REFERENCE, CLAIM_STATUS, CATEGORY_CODE");
			return req.reject({
				code: '404',
				message: "Failed to send Email Notification."
			});
		}
		let emailTemplateStatus = requestData.CLAIM_STATUS;
		if (emailTemplateStatus.includes('Cancellation Pending for approval')) {
			emailTemplateStatus = 'Cancellation Pending for approval';
		} else if (emailTemplateStatus.includes('Pending for approval')) {
			emailTemplateStatus = 'Pending for approval';
		}
		let emailTemplate = await tx.run(
			`SELECT TOP 1 *
             FROM "BENEFIT_EMAIL_TEMPLATE"
             WHERE "CATEGORY_CODE"='${requestData.CATEGORY_CODE}' AND 
                "CLAIM_STATUS"='${emailTemplateStatus}'`
		);
		if (emailTemplate.length === 0) {
			console.log("Email template not found!");
			return req.reject({
				code: '404',
				message: "Failed to send Email Notification."
			});
		}
		emailTemplate = emailTemplate[0];
		if (!emailTemplate.EMAIL_SUBJECT || !emailTemplate.EMAIL_BODY || !emailTemplate.RECIPIENT) {
			console.log("Email template data not maintained correctly!");
			return req.reject({
				code: '404',
				message: "Failed to send Email Notification."
			});
		}
		let claimStatusDetails = await tx.run(
			`SELECT *
             FROM "BENEFIT_CLAIM_STATUS"
             WHERE "CLAIM_REFERENCE"='${requestData.CLAIM_REFERENCE}'`
		);
		if (claimStatusDetails.length === 0) {
			console.log("Claim details not found!");
			return req.reject({
				code: '404',
				message: "Failed to send Email Notification."
			});
		}
		claimStatusDetails = claimStatusDetails[0];

		if (!requestData.TABLE_NAME) {
			console.log("Table Name not provided!");
			return req.reject({
				code: '404',
				message: "Failed to send Email Notification."
			});
		}
		let claimDetails = await tx.run(
			`SELECT *
             FROM "${requestData.TABLE_NAME}"
             WHERE "CLAIM_REFERENCE"='${requestData.CLAIM_REFERENCE}'`
		);
		if (claimDetails.length === 0) {
			console.log("Claim details not found!");
			return req.reject({
				code: '404',
				message: "Failed to send Email Notification."
			});
		}
		claimDetails = claimDetails[0];

		// Email Tempate Processing logic
		const templateKeys = [
			'{CLAIMREF}',
			'{CLAIMCODE}',
			'{CLAIMNAME}',
			'{CLAIMCATCODE}',
			'{CLAIMCATNAME}',
			'{CLAIMSTATUS}',
			'{CLAIMOWNER}',
			'{CLAIMDATE}',
			'{SUBMITDATE}',
			'{CLAIMAMT}',
			'{CLAIMPAY}',
			'{PAYREF}',
			'{NXTAPPROVER}',
			'{CLAIMOWNERID}',
			'{LASTACTIONDATE}',
			'{CANCELORIREF}',
			'{REMARKS_SUB}',
			'{REMARKS_A1}',
			'{REMARKS_A2}',
			'{REMARKS_A3}'
		];

		let subject = emailTemplate.EMAIL_SUBJECT;
		let body = emailTemplate.EMAIL_BODY;
		for (let i = 0; i < templateKeys.length; i++) {
			switch (templateKeys[i]) {
			case '{CLAIMCODE}':
				if (!requestData.CLAIM_CODE) {
					requestData.CLAIM_CODE = '-';
				}
				subject = subject.replace(/{CLAIMCODE}/g, requestData.CLAIM_CODE);
				body = body.replace(/{CLAIMCODE}/g, requestData.CLAIM_CODE);
				break;
			case '{CLAIMNAME}':
				if (!requestData.CLAIM_NAME) {
					requestData.CLAIM_NAME = '-';
				}
				subject = subject.replace(/{CLAIMNAME}/g, requestData.CLAIM_NAME);
				body = body.replace(/{CLAIMNAME}/g, requestData.CLAIM_NAME);
				break;
			case '{CLAIMSTATUS}':
				if (!requestData.CLAIM_STATUS) {
					requestData.CLAIM_STATUS = "-";
				}
				subject = subject.replace(/{CLAIMSTATUS}/g, requestData.CLAIM_STATUS);
				body = body.replace(/{CLAIMSTATUS}/g, requestData.CLAIM_STATUS);
				break;
			case '{CLAIMREF}':
				if (!requestData.CLAIM_REFERENCE) {
					requestData.CLAIM_REFERENCE = '-';
				}
				subject = subject.replace(/{CLAIMREF}/g, requestData.CLAIM_REFERENCE);
				body = body.replace(/{CLAIMREF}/g, requestData.CLAIM_REFERENCE);
				break;
			case '{CLAIMCATCODE}':
				if (!requestData.CATEGORY_CODE) {
					requestData.CATEGORY_CODE = '-';
				}
				subject = subject.replace(/{CLAIMCATCODE}/g, requestData.CATEGORY_CODE);
				body = body.replace(/{CLAIMCATCODE}/g, requestData.CATEGORY_CODE);
				break;
			case '{CLAIMCATNAME}':
				if (!requestData.CATEGORY_NAME) {
					requestData.CATEGORY_NAME = '-';
				}
				subject = subject.replace(/{CLAIMCATNAME}/g, requestData.CATEGORY_NAME);
				body = body.replace(/{CLAIMCATNAME}/g, requestData.CATEGORY_NAME);
				break;
			case '{CLAIMDATE}':
				if (!requestData.CLAIM_DATE) {
					requestData.CLAIM_DATE = '-';
				}
				subject = subject.replace(/{CLAIMDATE}/g, dateFormatDDMMYYYY(requestData.CLAIM_DATE));
				body = body.replace(/{CLAIMDATE}/g, dateFormatDDMMYYYY(requestData.CLAIM_DATE));
				break;
			case '{SUBMITDATE}':
				if (!claimStatusDetails.SUBMIT_DATE) {
					claimStatusDetails.SUBMIT_DATE = '-';
				}
				subject = subject.replace(/{SUBMITDATE}/g, dateFormatDDMMYYYY(claimStatusDetails.SUBMIT_DATE));
				body = body.replace(/{SUBMITDATE}/g, dateFormatDDMMYYYY(claimStatusDetails.SUBMIT_DATE));
				break;
			case '{CLAIMOWNER}':
				if (!requestData.CLAIM_OWNER_NAME) {
					requestData.CLAIM_OWNER_NAME = '-';
				}
				subject = subject.replace(/{CLAIMOWNER}/g, requestData.CLAIM_OWNER_NAME);
				body = body.replace(/{CLAIMOWNER}/g, requestData.CLAIM_OWNER_NAME);
				break;
			case '{CLAIMAMT}':
				if (!claimDetails.CLAIM_AMOUNT) {
					claimDetails.CLAIM_AMOUNT = '-';
				}
				subject = subject.replace(/{CLAIMAMT}/g, claimDetails.CLAIM_AMOUNT);
				body = body.replace(/{CLAIMAMT}/g, claimDetails.CLAIM_AMOUNT);
				break;
			case '{CLAIMPAY}':
				if (!claimDetails.AMOUNT_PAID_VIA_PAYROLL) {
					claimDetails.AMOUNT_PAID_VIA_PAYROLL = '-';
				}
				subject = subject.replace(/{CLAIMPAY}/g, claimDetails.AMOUNT_PAID_VIA_PAYROLL);
				body = body.replace(/{CLAIMPAY}/g, claimDetails.AMOUNT_PAID_VIA_PAYROLL);
				break;
			case '{PAYREF}':
				let paymentReference = await tx.run(
					`SELECT "CLAIM_REF_NUMBER"
			             FROM "SF_REPLICATION_LOGS"
			             WHERE "INTERNAL_CLAIM_REFERENCE"='${requestData.CLAIM_REFERENCE}' AND 
			            		"CLAIM_STATUS"='${requestData.CLAIM_STATUS}'`
				);
				if (paymentReference.length === 0) {
					paymentReference = '-';
				} else {
					paymentReference = paymentReference[0].CLAIM_REF_NUMBER;
				}
				if (!paymentReference) {
					paymentReference = '-';
				}
				subject = subject.replace(/{PAYREF}/g, paymentReference);
				body = body.replace(/{PAYREF}/g, paymentReference);
				break;
			case '{NXTAPPROVER}':
				let nxtApproverID = claimStatusDetails['APPROVER' + claimStatusDetails.CURRENT_LEVEL];
				let approverName = '';
				let empInfo = await tx.run(
					`SELECT "FIRSTNAME", "LASTNAME"
			             FROM "SF_PERPERSONAL"
			             WHERE "PERSONIDEXTERNAL"='${nxtApproverID}'`
				);
				if (empInfo.length !== 0) {
					approverName = empInfo[0].FIRSTNAME + ' ' + empInfo[0].LASTNAME;
				}
				subject = subject.replace(/{NXTAPPROVER}/g, approverName);
				body = body.replace(/{NXTAPPROVER}/g, approverName);
				break;
			case '{CLAIMOWNERID}':
				if (!requestData.CLAIM_OWNER_ID) {
					requestData.CLAIM_OWNER_ID = '-';
				}
				subject = subject.replace(/{CLAIMOWNERID}/g, requestData.CLAIM_OWNER_ID);
				body = body.replace(/{CLAIMOWNERID}/g, requestData.CLAIM_OWNER_ID);
				break;
			case '{CANCELORIREF}':
				let cancelOriginalReference = await tx.run(
					`SELECT "PARENT_CLAIM_REFERENCE"
			             FROM "BENEFIT_CLAIM_CANCEL_MASTER"
			             WHERE "CLAIM_REFERENCE"='${requestData.CLAIM_REFERENCE}'`
				);
				if (cancelOriginalReference.length === 0) {
					cancelOriginalReference = '-';
				} else {
					cancelOriginalReference = cancelOriginalReference[0].PARENT_CLAIM_REFERENCE;
				}
				if (!cancelOriginalReference) {
					cancelOriginalReference = '-';
				}
				subject = subject.replace(/{CANCELORIREF}/g, cancelOriginalReference);
				body = body.replace(/{CANCELORIREF}/g, cancelOriginalReference);
				break;
			case '{LASTACTIONDATE}':
				let lastActionDate = '-';
				if (claimDetails.FOURTH_LEVEL_APPROVED_ON) {
					lastActionDate = claimDetails.FOURTH_LEVEL_APPROVED_ON;
				} else if (claimDetails.THIRD_LEVEL_APPROVED_ON) {
					lastActionDate = claimDetails.THIRD_LEVEL_APPROVED_ON;
				} else if (claimDetails.SECOND_LEVEL_APPROVED_ON) {
					lastActionDate = claimDetails.SECOND_LEVEL_APPROVED_ON;
				} else if (claimDetails.FIRST_LEVEL_APPROVED_ON) {
					lastActionDate = claimDetails.FIRST_LEVEL_APPROVED_ON;
				}
				subject = subject.replace(/{LASTACTIONDATE}/g, dateFormatDDMMYYYY(lastActionDate));
				body = body.replace(/{LASTACTIONDATE}/g, dateFormatDDMMYYYY(lastActionDate));
				break;
			case '{REMARKS_SUB}':
				if (!claimDetails.REMARKS_EMPLOYEE) {
					claimDetails.REMARKS_EMPLOYEE = '-';
				}
				subject = subject.replace(/{REMARKS_SUB}/g, claimDetails.REMARKS_EMPLOYEE);
				body = body.replace(/{REMARKS_SUB}/g, claimDetails.REMARKS_EMPLOYEE);
				break;
			case '{REMARKS_A1}':
				if (!claimDetails.REMARKS_APPROVER1) {
					claimDetails.REMARKS_APPROVER1 = '-';
				}
				subject = subject.replace(/{REMARKS_A1}/g, claimDetails.REMARKS_APPROVER1);
				body = body.replace(/{REMARKS_A1}/g, claimDetails.REMARKS_APPROVER1);
				break;
			case '{REMARKS_A2}':
				if (!claimDetails.REMARKS_APPROVER2) {
					claimDetails.REMARKS_APPROVER2 = '-';
				}
				subject = subject.replace(/{REMARKS_A2}/g, claimDetails.REMARKS_APPROVER2);
				body = body.replace(/{REMARKS_A2}/g, claimDetails.REMARKS_APPROVER2);
				break;
			case '{REMARKS_A3}':
				if (!claimDetails.REMARKS_APPROVER3) {
					claimDetails.REMARKS_APPROVER3 = '-';
				}
				subject = subject.replace(/{REMARKS_A3}/g, claimDetails.REMARKS_APPROVER3);
				body = body.replace(/{REMARKS_A3}/g, claimDetails.REMARKS_APPROVER3);
				break;
			}
		}

		// Retrieve Recipients Email IDs
		let recipientKeys = emailTemplate.RECIPIENT.split(";");
		let recipientEmpIDs = [];
		for (let j = 0; j < recipientKeys.length; j++) {
			let recipientEmpID = '';
			switch (recipientKeys[j]) {
			case '{OWNER}':
				recipientEmpID = claimStatusDetails.OWNER;
				break;
			case '{SUBMITTER}':
				if (claimStatusDetails.SUBMITTED_BY === claimStatusDetails.OWNER) {
					recipientEmpID = claimStatusDetails.OWNER;
				} else {
					recipientEmpID = claimStatusDetails.SUBMITTED_BY;
				}
				break;
			case '{NXTAPPROVER}':
				recipientEmpID = claimStatusDetails['APPROVER' + claimStatusDetails.CURRENT_LEVEL];
				break;
			}
			if (!recipientEmpID) {
				recipientEmpID = '';
			}
			let empIDExists = recipientEmpIDs.find((item) => {
				return item === recipientEmpID;
			});
			if (!empIDExists) {
				recipientEmpIDs.push(recipientEmpID);
			}
		}

		if (recipientEmpIDs.length === 0) {
			console.log("Recipient's Employee ID not found!");
			return req.reject({
				code: '404',
				message: "Failed to send Email Notification."
			});
		}
		let filteredRecipientEmpIDs = recipientEmpIDs.filter((item) => {
			return item !== '';
		});
		let recipientEmpIDStr = filteredRecipientEmpIDs.join("','");
		let recipientEmailIDResult = await tx.run(
			`SELECT
				"EMAILADDRESS"
			 FROM "SF_PEREMAIL" WHERE "PERSONIDEXTERNAL" IN ('${recipientEmpIDStr}')`
		);
		if (recipientEmailIDResult.length === 0 || recipientEmailIDResult.length !== filteredRecipientEmpIDs.length) {
			console.log(`Recipient's Email ID not found!: ${recipientEmpIDStr}`);
			return req.reject({
				code: '404',
				message: "Failed to send Email Notification."
			});
		}
		let recipientEmailIDs = [];
		for (let k = 0; k < recipientEmailIDResult.length; k++) {
			if (recipientEmailIDResult[k].EMAILADDRESS) {
				recipientEmailIDs.push(recipientEmailIDResult[k].EMAILADDRESS);
			}
		}

		// Setting CPI Service Payload
		let payload = {
			"recipient": recipientEmailIDs.join(","), // Uncomment after testing
			// "recipient": 'kkong@abeam.com,tvinothkumar@abeam.com,pkaruppiah@abeam.com', // Remove after testing
			"emailSubject": subject,
			"emailBody": body
		};
		console.log("-----------------------------Payload-------------------------:", payload);
		// Calling OAuth API to fetch token
		return rp({
			uri: uaa_service.url + '/oauth/token',
			method: 'POST',
			headers: {
				'Authorization': 'Basic ' + Buffer.from(sUaaCredentials).toString('base64'),
				'Content-type': 'application/x-www-form-urlencoded'
			},
			form: {
				'client_id': dest_service.clientid,
				'grant_type': 'client_credentials'
			}
		}).then((data) => {
			// Setting token in Destination service and calling service to get destination details
			const token = JSON.parse(data).access_token;
			return rp({
				uri: dest_service.uri + '/destination-configuration/v1/destinations/' + sCPIEmailDestinationName,
				headers: {
					'Authorization': 'Bearer ' + token
				}
			});
		}).then((data) => {
			if (data) {
				// Parsing destination data
				const oDestination = JSON.parse(data);
				// Encoding credentials
				const sCPIDestCredentials = oDestination.destinationConfiguration['User'] + ':' + oDestination.destinationConfiguration['Password'];
				// Calling CPI Email triggering service
				return rp({
					uri: oDestination.destinationConfiguration['URL'],
					method: 'POST',
					json: true,
					headers: {
						'Authorization': 'Basic ' + Buffer.from(sCPIDestCredentials).toString('base64'),
						'Content-type': 'application/json'
					},
					body: payload
				});
			} else {
				throw new Error('Destination not found.');
			}
		}).then((data) => {
			return {
				message: "Mail sent successfully."
			};
		}).catch((error) => {
			return req.error(500, error);
		});
	});

	srv.on('claimApprovalOrReject', async(req) => {

		try {
			var listofClaims = JSON.parse(req.data.listofClaims);
			// var tableName = req.data.table_Name;
			var approvalorRejectFlag = req.data.ARF;
			var Approver_Comments = req.data.APP_COMMENT;
			var sp, output;
			// var userid = JSON.parse(req.data.input1);
			// var array = ["1"];
			// var mapped = array.map((data) => {
			// 	return {
			// 		input1: data
			// 	};
			// })
			// var query = SELECT.from(claimApproverView);
			// var output = await cds.run(query, mapped);
			// console.log(output)
			// return true

			// console.log(userid);
			let dbConn = new dbClass(await dbClass.createConnection(db.options.credentials))

			sp = await dbConn.loadProcedurePromisified(hdbext, null, 'proc_approve_claim')
			output = await dbConn.callProcedurePromisified(sp, [listofClaims, approvalorRejectFlag, Approver_Comments]);

			//         const tx = cds.transaction(req)
			// var vProcedure = 'call claimApprovalStructure(RESULT => ?)'
			// return tx.run (vProcedure)	
			console.log(output)
			return output
		} catch (error) {
			console.error(error)
				// return false
		}
	});

	srv.on('claimApprovalOrRejectItems', async(req) => {

		try {
			const tx = cds.transaction(req);
			var listofClaims = JSON.parse(req.data.listofClaims);
			var tableName = req.data.table_Name;
			var approvalorRejectFlag = req.data.ARF;
			var Approver_Comments = req.data.APP_COMMENT;
			var sp, output, lineItemUpdate = [],
				LineItems = [];

			if (listofClaims.LINE_ITEM != undefined && listofClaims.LINE_ITEM != null) {
				LineItems = listofClaims.LINE_ITEM;
				delete listofClaims.LINE_ITEM;
			}

			var oldClaim_Reference = listofClaims.CLAIM_REFERENCE;
			//Create a Copy of the original Claim
			listofClaims.CLAIM_REFERENCE = listofClaims.CATEGORY_CODE + new Date().getTime().toString();
			var tableNameKey = getTableKeyEntries(tableName);

			var tableLineitem = tableName.split("MASTER").join('LINEITEM');
			var tableLineKey = getTableKeyEntries(tableLineitem);

			var claimNewForApprove = await tx.run(INSERT.into(tableNameKey.table_Name).entries(listofClaims));
			// await tx.commit();
			if (claimNewForApprove.length != 0) {
				for (let index in LineItems) {
					LineItems[index].PARENT_CLAIM_REFERENCE = listofClaims.CLAIM_REFERENCE;
					var items = LineItems[index];
					//Update Parent Reference Line Item 
					var updateLine = await tx.run(UPDATE(tableLineKey.table_Name).set({
						PARENT_CLAIM_REFERENCE: listofClaims.CLAIM_REFERENCE
					}).where({
						CLAIM_REFERENCE: items.CLAIM_REFERENCE
					}));
					// await tx.commit();
					if (updateLine.length = 0) {
						lineItemUpdate.push[LineItems[index].CLAIM_REFERENCE];
					}
				}
				// LineItems.forEach(async(items, index) => {
				// 	LineItems[index].PARENT_CLAIM_REFERENCE = listofClaims.CLAIM_REFERENCE;
				// 	//Update Parent Reference Line Item 
				// 	var updateLine = await tx.run(UPDATE(tableLineKey.table_Name).set({
				// 		PARENT_CLAIM_REFERENCE: listofClaims.CLAIM_REFERENCE
				// 	}).where({
				// 		CLAIM_REFERENCE: items.CLAIM_REFERENCE
				// 	}));
				// 	// await tx.commit();
				// 	if (updateLine.length = 0) {
				// 		lineItemUpdate.push[LineItems[index].CLAIM_REFERENCE];
				// 	}
				// })
			} else {
				return req.reject({
					code: '400',
					message: "Cancellation request failed"
				})
			}

			if (lineItemUpdate.length > 0) {
				return req.reject({
					code: '400',
					message: "The following Line Item Update Failed " + lineItemUpdate.join()
				})
			} else {
				//Add entry in Approval table
				var approvalData = await tx.run(
					SELECT.from(approval).where({
						CLAIM_REFERENCE: oldClaim_Reference
					})
				);

				if (approvalData.length == 0) {
					return req.reject({
						code: '400',
						message: "The following Approval Item is notavailable " + oldClaim_Reference
					})
				} else {
					approvalData[0].CLAIM_REFERENCE = listofClaims.CLAIM_REFERENCE;
					var approvalinsert = await tx.run(INSERT.into(approval).entries(approvalData[0]));
					var approvalNewData = await tx.run(
						SELECT.from(approval).where({
							CLAIM_REFERENCE: approvalData[0].CLAIM_REFERENCE
						})
					);
					// await tx.commit();
				}
				//Add entry in Claim Status table
				var claimStatusEntry = await tx.run(
					SELECT.from(Claim_Status).where({
						EMPLOYEE_ID: listofClaims.EMPLOYEE_ID,
						CLAIM_REFERENCE: oldClaim_Reference
					})
				);

				if (claimStatusEntry.length == 0) {
					return req.reject({
						code: '400',
						message: "The following Claim Status Item is not available " + oldClaim_Reference
					})
				} else {
					claimStatusEntry[0].Claim_Reference = listofClaims.CLAIM_REFERENCE;
					var claimstatusinsert = await tx.run(INSERT.into(Claim_Status).entries(claimStatusEntry[0]));

				}
			}

			await tx.commit();
			if (approvalNewData.length != 0) {
				await tx.begin();
				let dbConn = new dbClass(await dbClass.createConnection(db.options.credentials))

				sp = await dbConn.loadProcedurePromisified(hdbext, null, 'proc_approve_claim')
				output = await dbConn.callProcedurePromisified(sp, [approvalNewData, approvalorRejectFlag, Approver_Comments]);

				//         const tx = cds.transaction(req)
				// var vProcedure = 'call claimApprovalStructure(RESULT => ?)'
				// return tx.run (vProcedure)	
				// output={data:{
				// 	approval:approvalNewData,
				// 	ARF:approvalorRejectFlag,
				// 	APP_COMMENT:Approver_Comments
				// }
				// }
				console.log(output)
				console.log(approvalNewData);
				// const tx = cds.transaction(req)
				// var vProcedure = `call "proc_approval_flow"(LT_VAR_OUT => ?,LT_CLAIM_REFERENCE=> '${approvalNewData[0].CLAIM_REFERENCE}',VAR_ARF=>'${approvalorRejectFlag}',APP_COMMENT=>'${Approver_Comments}')`
				// return tx.run (vProcedure)	
				return output;
			} else {
				return req.reject({
					code: '400',
					message: "Issue in creation of new Approval entry with new reference " + listofClaims.CLAIM_REFERENCE + " and old referenece " +
						oldClaim_Reference
				})
			}
		} catch (error) {
			console.error(error)
				// return false
		}
	});
	
	srv.on('validateClaimCancellation', async (req) => {
		const tx = cds.transaction(req);
		let claimReference = req.data.CLAIM_REFERENCE;
		let lineItemClaimReference = req.data.LINEITEM_CLAIM_REFERENCE;
		if (!claimReference) {
			return req.reject({
				code: '400',
				message: 'Please provide claim reference.'
			});
		}
		async function checkPostingDateValidation(req, tx, masterClaimReference, lineItemClaimReference) {
			let claimReference = (lineItemClaimReference !== '') ? lineItemClaimReference : masterClaimReference;
			let currentTimestamp = dateTimeFormat(new Date());
			let replicationLogResult = await tx.run(`
				SELECT "REP_TIMESTAMP" FROM "SF_REPLICATION_LOGS" WHERE "INTERNAL_CLAIM_REFERENCE"='${claimReference}' AND "REP_STATUS"='Success'
			`);
			if (replicationLogResult.length > 0) {
				let postingEstDateResult = await tx.run(`
					SELECT * FROM "SF_POSTINGESTDATE" WHERE "REP_START_DATE" <= '${replicationLogResult[0].REP_TIMESTAMP}' AND 
					"REP_END_DATE" >= '${replicationLogResult[0].REP_TIMESTAMP}' AND 
					"REP_START_DATE" <= '${currentTimestamp}' AND "REP_END_DATE" >= '${currentTimestamp}'
				`);
				if (postingEstDateResult.length === 0) {
					return req.reject({
						code: '422',
						message: 'Cancellation not allowed for past posting period.'
					});
				}
			}
		}
		let originalClaimReferenceStatusResult1 = await tx.run(`
			SELECT * FROM "BENEFIT_CLAIM_STATUS" WHERE "CLAIM_REFERENCE"='${claimReference}' AND ("STATUS"='Cancelled' OR "STATUS"='Cancellation Approved' OR "STATUS"='Rejected')
		`);
		if (originalClaimReferenceStatusResult1.length > 0) {
			return req.reject({
				code: '422',
				message: 'Claim status has changed. Please referesh the page.'
			});
		}
		let originalClaimReferenceStatusResult2 = await tx.run(`
			SELECT * FROM "BENEFIT_CLAIM_STATUS" WHERE "CLAIM_REFERENCE"='${claimReference}' AND "STATUS"='Approved'
		`);
		if (originalClaimReferenceStatusResult2.length > 0) {
			let cancelMasterResult = await tx.run(`
				SELECT * FROM "BENEFIT_CLAIM_CANCEL_MASTER" WHERE "PARENT_CLAIM_REFERENCE"='${originalClaimReferenceStatusResult2[0].CLAIM_REFERENCE}'
			`);
			if (cancelMasterResult.length > 0) {
				let cancelRefStatusResult = await tx.run(`
					SELECT * FROM "BENEFIT_CLAIM_STATUS" WHERE "CLAIM_REFERENCE"='${cancelMasterResult[0].CLAIM_REFERENCE}' AND
					("STATUS" LIKE 'Cancellation Pending%' OR "STATUS"='Cancellation Approved')
				`);
				if (cancelRefStatusResult.length > 0) {
					if (cancelRefStatusResult[0].STATUS === 'Cancellation Approved') {
						return req.reject({
							code: '422',
							message: 'Cancellation already Approved. Please referesh the page.'
						});
					} else {
						return req.reject({
							code: '422',
							message: 'Cancellation already is in progress. Please referesh the page.'
						});
					}
				} else {
					await checkPostingDateValidation(req, tx, claimReference, lineItemClaimReference);
				}
			} else {
				await checkPostingDateValidation(req, tx, claimReference, lineItemClaimReference);
			}
		}
		return {
			message: 'Validated successfully.'
		}
	});

	srv.on('delegateApprover', async(req) => {

		try {
			var listofClaims = JSON.parse(req.data.listofClaims);
			var Approver_Comments = req.data.APP_COMMENT;
			var DelegateApp = req.data.DELEGATE_APPROVER;
			var approvalorRejectFlag = req.data.VAR_ARF;
			var sp, output;
			// var userid = JSON.parse(req.data.input1);
			// var array = ["1"];
			// var mapped = array.map((data) => {
			// 	return {
			// 		input1: data
			// 	};
			// })
			// var query = SELECT.from(claimApproverView);
			// var output = await cds.run(query, mapped);
			// console.log(output)
			// return true

			// console.log(userid);
			let dbConn = new dbClass(await dbClass.createConnection(db.options.credentials))

			sp = await dbConn.loadProcedurePromisified(hdbext, null, 'proc_delegate')
			output = await dbConn.callProcedurePromisified(sp, [listofClaims, Approver_Comments, approvalorRejectFlag, DelegateApp]);

			//         const tx = cds.transaction(req)
			// var vProcedure = 'call claimApprovalStructure(RESULT => ?)'
			// return tx.run (vProcedure)	
			console.log(output)
			return output
		} catch (error) {
			console.error(error)
				// return false
		}
	});

	srv.on('rerouteApprover', async(req) => {

		try {
			var listofClaims = JSON.parse(req.data.listofClaims);
			var Approver_Comments = req.data.APP_COMMENT;
			var RerouteApp = req.data.REROUTE_APPROVER;
			var approvalorRejectFlag = req.data.VAR_ARF;
			var REROUTE_BY = req.data.REROUTE_BY
			var sp, output;
			// var userid = JSON.parse(req.data.input1);
			// var array = ["1"];
			// var mapped = array.map((data) => {
			// 	return {
			// 		input1: data
			// 	};
			// })
			// var query = SELECT.from(claimApproverView);
			// var output = await cds.run(query, mapped);
			// console.log(output)
			// return true

			// console.log(userid);
			let dbConn = new dbClass(await dbClass.createConnection(db.options.credentials))

			sp = await dbConn.loadProcedurePromisified(hdbext, null, 'proc_reroute')
			output = await dbConn.callProcedurePromisified(sp, [listofClaims, Approver_Comments, approvalorRejectFlag, RerouteApp, REROUTE_BY]);

			//         const tx = cds.transaction(req)
			// var vProcedure = 'call claimApprovalStructure(RESULT => ?)'
			// return tx.run (vProcedure)	
			console.log(output)
			return output
		} catch (error) {
			console.error(error)
				// return false
		}
	});
	// srv.after('claimApprovalOrRejectItems', async(req) => {

	// try {
	// var listofClaims = req.data.approval;
	// var tableName = req.data.table_Name;
	// var approvalorRejectFlag = req.data.ARF;
	// var Approver_Comments = req.data.APP_COMMENT;
	// var sp, output;
	// var userid = JSON.parse(req.data.input1);
	// var array = ["1"];
	// var mapped = array.map((data) => {
	// 	return {
	// 		input1: data
	// 	};
	// })
	// var query = SELECT.from(claimApproverView);
	// var output = await cds.run(query, mapped);
	// console.log(output)
	// return true

	// console.log(userid);
	// let dbConn = new dbClass(await dbClass.createConnection(db.options.credentials))

	// sp = await dbConn.loadProcedurePromisified(hdbext, null, 'proc_approve_claim')
	// output = await dbConn.callProcedurePromisified(sp, [listofClaims, approvalorRejectFlag, Approver_Comments]);

	//         const tx = cds.transaction(req)
	// var vProcedure = 'call "proc_approval_flow"(LT_VAR_OUT => ?)'
	// return tx.run (vProcedure)	
	// console.log(output)
	// return output
	// } catch (error) {
	// 	console.error(error)
	// return false
	// }
	// console.log(req);
	// });

	/**
	 * claim validation
	 * @param {entity}
	 * @return string
	 */

	srv.on('validateClaim', async(req, res) => {
		try {
			let data = req.data.copay;
			let aAfterValidation = [];

			/*	if (req.data && req.data.copay.length > 0) {
					data = req.data.copay;
				} else {
					return req.error('400', `Provide values !`);
				}*/

			if (!data.CLAIM_CODE || !data.CLAIM_REFERENCE || !data.CLAIM_DATE || !data.CLINIC || !data.RECEIPT_NUMBER) {
				return req.error('400', `Fill all the mandotery fields !`);
			}

			if ((parseFloat(data.CASH_AMOUNT) + parseFloat(data.MEDISAVE_AMOUNT) +
					parseFloat(data.MEDISHIELD_AMOUNT) + parseFloat(data.PRIVATE_INSURER_AMT)) === parseFloat(data.RECEIPT_AMOUNT)) {
				return req.error('401', `Please ensure cash + medisave + medishield + private insurer amount = total receipt amount !`);
			}
			//validate Claim Amount

			//Amount paid via Payroll
			if (parseFloat(data.AMOUNT_PAID_VIA_PAYROLL) > parseFloat(data.Claim_Amount)) {
				//	return { message: `Amount Paid Via Payroll: ${CLAIM_AMOUNT}`};
				aAfterValidation.push({
					"message": `Amount Paid Via Payroll: ${data.Claim_Amount}`
				});
			} else {
				//	return {message: `Amount Paid Via Payroll: ${AMOUNT_PAID_VIA_PAYROLL}`};
				aAfterValidation.push({
					"message": `Amount Paid Via Payroll: ${data.AMOUNT_PAID_VIA_PAYROLL}`
				});
			}
			//Amount Paid to Medisave
			let iAmountPaidToMedisave = 0;
			if (parseFloat(data.MEDISAVE_AMOUNT) >= (parseFloat(data.Claim_Amount) - parseFloat(data.AMOUNT_PAID_VIA_PAYROLL))) {
				iAmountPaidToMedisave = parseFloat(data.Claim_Amount) - parseFloat(data.AMOUNT_PAID_VIA_PAYROLL);
				aAfterValidation.push({
					"message": `Amount Paid to Medisave: ${iAmountPaidToMedisave}`
				});
			} else {
				iAmountPaidToMedisave = parseFloat(data.Claim_Amount) - parseFloat(data.AMOUNT_PAID_VIA_PAYROLL);
				aAfterValidation.push({
					"message": `Amount Paid to Medisave: ${iAmountPaidToMedisave}`
				});
			}

			//Amount Paid to Medishield
			let iAmountPaidToMedishield = 0;
			if (parseFloat(data.MEDISHIELD_AMOUNT) >= (parseFloat(data.Claim_Amount) - parseFloat(data.AMOUNT_PAID_VIA_PAYROLL) -
					parseFloat(data.MEDISAVE_AMOUNT))) {
				iAmountPaidToMedishield = parseFloat(data.Claim_Amount) - parseFloat(data.AMOUNT_PAID_VIA_PAYROLL) - parseFloat(
					data.MEDISAVE_AMOUNT);
				aAfterValidation.push({
					"message": `Amount Paid to Medishield: ${iAmountPaidToMedishield}`
				});
			} else {
				iAmountPaidToMedishield = parseFloat(data.MEDISHIELD_AMOUNT);
				aAfterValidation.push({
					"message": `Amount Paid to Medishield: ${iAmountPaidToMedishield}`
				});
			}
			//Amount Paid to Private Insurer
			let amountPaidToPrivateInsurer = 0;
			if (parseFloat(data.PRIVATE_INSURER_AMT) >= (parseFloat(data.Claim_Amount) - parseFloat(data.AMOUNT_PAID_VIA_PAYROLL) -
					parseFloat(data.AMOUNT_PAID_TOMEDISAVE) - parseFloat(data.AMOUNT_PAID_TOMDEISHIELD))) {
				amountPaidToPrivateInsurer = parseFloat(data.Claim_Amount) - parseFloat(data.AMOUNT_PAID_VIA_PAYROLL) - parseFloat(
					data.AMOUNT_PAID_TOMEDISAVE) - parseFloat(data.AMOUNT_PAID_TOMDEISHIELD);
				aAfterValidation.push({
					"message": `Amount Paid to Private Insurer: ${amountPaidToPrivateInsurer}`
				});
			} else {
				//amountPaidToPrivateInsurer = parseFloat(PRIVATE_INSURER_AMT);
				aAfterValidation.push({
					"message": `Amount Paid to Private Insurer: ${amountPaidToPrivateInsurer}`
				});
			}

			return aAfterValidation;

		} catch (err) {
			req.error(500, err.message);
		}

	});

	/**
	 * Medical Benefit details
	 *  
	 * */

	srv.on('claimDetails', async(req, res) => {
		try {
			let data = req.data.claim;
			const tx = cds.transaction(req);
			//===================================
			let currentYear = data.claimDate.split("-")[0];
			let first_date = [currentYear, '01', '01'].join('-');
			let last_date = [currentYear, 12, 31].join('-');

			let approvedMedicalClaimQuery =
				`
				SELECT "EMPLOYEE_ID",
	                "CLAIM_AMOUNT", 
	                "CLAIM_CONSULTATION_FEE",
	                "CLAIM_OTHER_COST",
	                "NO_OF_WARD_DAYS",
	                "WARD_CHARGES",
	                "CLAIM_AMOUNT_WW"   
	                FROM "BENEFIT_MEDICAL_CLAIM"
	            WHERE "EMPLOYEE_ID"=${data.employeeId} AND
	            	"CLAIM_STATUS"='Approved' AND `;

			let pendingMedicalClaimQuery =
				`
				SELECT "EMPLOYEE_ID",
	                "CLAIM_AMOUNT", 
	                "CLAIM_CONSULTATION_FEE",
	                "CLAIM_OTHER_COST",
	                "NO_OF_WARD_DAYS",
	                "WARD_CHARGES",
	                "CLAIM_AMOUNT_WW" 
	            FROM "BENEFIT_MEDICAL_CLAIM" 
	            WHERE "EMPLOYEE_ID"=${data.employeeId} AND 
	            	"CLAIM_STATUS" LIKE 'Pending for approval%' AND `;

			let querySubString = '';
			if (data.Claim_Code === 'OPTS') {
				querySubString = `"CLAIM_CODE" IN ('OPTS', 'OPTD') AND "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'`;
			} else if (data.Claim_Code === "OPTD") {
				querySubString = `"CLAIM_CODE" IN ('OPTD') AND "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'`;
			} else {
				querySubString = `"CLAIM_CODE"='${data.Claim_Code}' AND "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'`;
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

				// Summation
				data.taken = parseFloat(data.taken) + parseFloat(approvedClaims[i].CLAIM_AMOUNT);
				data.consumedWardDays = parseFloat(data.consumedWardDays) + parseFloat(approvedClaims[i].NO_OF_WARD_DAYS);
				data.claimAmountWW = parseFloat(data.claimAmountWW) + parseFloat(approvedClaims[i].CLAIM_AMOUNT_WW);
				// New logic for YTDConsultation and YTDOthers
				data.YTDConsultation = parseFloat(data.YTDConsultation) + parseFloat(approvedClaims[i].CLAIM_CONSULTATION_FEE);
				data.YTDOthers = parseFloat(data.YTDOthers) + parseFloat(approvedClaims[i].CLAIM_OTHER_COST);
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
				data.pendingWardDays = parseFloat(data.pendingWardDays) + parseFloat(pendingClaims[j].NO_OF_WARD_DAYS);
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
			if (data.Claim_Code === 'HOSPS' || data.Claim_Code === 'HOSPD') {
				let eligibilitySQL =
					`SELECT  "CLAIM_CODE",
		                      "SEQUENCE",
		                      "EFFECTIVE_DATE",
		                      "END_DATE",
		                      "ENTITLEMENT",
		                      "CATEGORY_CODE",
		                      "CATEGORY_DESC"
		                FROM "SF_EMPLOYEEELIGIBILITY"('${data.employeeId}')
		                    WHERE  "CLAIM_CODE" = '${data.Claim_Code}_Day'  AND
		                            "EFFECTIVE_DATE" >= '1900-01-01' AND
		                            "END_DATE" <= '9999-12-31'`;
	
				let eligibilityData = await tx.run(eligibilitySQL);
				if (eligibilityData.length > 0) {
					let prorationPayload = {
						UserID: data.employeeId,
						Entitlement: eligibilityData[0].ENTITLEMENT,
						EmpType: "",
						WorkingPeriod: "",
						ClaimDetail: {
							Date: new Date(data.claimDate),
							Company: data.company,
							Claim_Code: `${data.Claim_Code}_DAY`, //data.Claim_Code
							Claim_Category: eligibilityData[0].CATEGORY_CODE
						}
					};
					let prorationResult = await prorationRule(prorationPayload, req, false);
					data.totalWardDays = parseFloat2Decimals(prorationResult.value);
					data.remainingWardDays = parseFloat2Decimals(data.totalWardDays - data.consumedWardDays - data.pendingWardDays);
				} else {
					data.totalWardDays = parseFloat2Decimals(0);
					data.remainingWardDays = parseFloat2Decimals(0);
				}
			} else {
				data.totalWardDays = parseFloat2Decimals(0);
				data.remainingWardDays = parseFloat2Decimals(0);
			}

			return data;
		} catch (err) {
			req.error(422, err.message);
		}
	});

	/**
	 * Action for medical claim validation
	 * @param {entity}
	 * rerurns 
	 */

	function parseFloat2Decimals(value) {
		//Sahas Round Off issue
		// return parseFloat(parseFloat(value).toFixed(2));
		return parseFloat((Math.round(value * 100) / 100).toFixed(2))
			//End Sahas Round Off issue
	}

	srv.on('validateMedicalClaim', async(req, res) => {
		let data = req.data.claim;
		let aAfterValidation = [];
		const tx = cds.transaction(req);
		//=======================================================================================
		//  				Calculation of Claim as per genral rules
		//=======================================================================================

		/*if (parseFloat(data.Claim_Amount) > parseFloat(data.balance)) {
			data.AL_Exceeded = 'Yes';
		} else {
			data.AL_Exceeded = 'No';
		}*/

		if (!data.RECEIPT_AMOUNT) {
			data.RECEIPT_AMOUNT = 0;
		}
		if (!data.Consultation_Fee) {
			data.Consultation_Fee = 0;
		}
		if (!data.Hospitalization_Fees) {
			data.Hospitalization_Fees = 0;
		}
		if (!data.Hospitalization_Fees_Display) {
			data.Hospitalization_Fees_Display = 0;
		}
		if (!data.wardCharges) {
			data.wardCharges = 0;
		}
		if (!data.Other_Cost) {
			data.Other_Cost = 0;
		}
		if (!data.CASH_AMOUNT) {
			data.CASH_AMOUNT = 0;
		}
		if (!data.MEDISAVE_AMOUNT) {
			data.MEDISAVE_AMOUNT = 0;
		}
		if (!data.MEDISHIELD_AMOUNT) {
			data.MEDISHIELD_AMOUNT = 0;
		}
		if (!data.PRIVATE_INSURER_AMT) {
			data.PRIVATE_INSURER_AMT = 0;
		}
		if (!data.AMOUNT_PAID_VIA_PAYROLL) {
			data.AMOUNT_PAID_VIA_PAYROLL = 0;
		}
		if (!data.AMOUNT_PAID_TOMEDISAVE) {
			data.AMOUNT_PAID_TOMEDISAVE = 0;
		}
		if (!data.AMOUNT_PAID_TOMDEISHIELD) {
			data.AMOUNT_PAID_TOMDEISHIELD = 0;
		}
		if (!data.AMOUNT_PAID_TO_PRIVATE_INSURER) {
			data.AMOUNT_PAID_TO_PRIVATE_INSURER = 0;
		}
		if (!data.balance) {
			data.balance = 0;
		}

		/*const existingClaimDetails = await tx.run(
			`SELECT
				"CLAIM_AMOUNT"
			 FROM "BENEFIT_MEDICAL_CLAIM"
			 WHERE "CLAIM_REFERENCE"='${data.Claim_Reference}' AND 
			 "CLAIM_STATUS" LIKE 'Pending for approval%'`
		);

		if (existingClaimDetails.length > 0 && existingClaimDetails[0].CLAIM_AMOUNT) {
			data.pending = parseFloat2Decimals(data.pending) - parseFloat2Decimals(existingClaimDetails[0].CLAIM_AMOUNT);
			data.balance = parseFloat2Decimals(data.eligibility) - parseFloat2Decimals(data.taken) - parseFloat2Decimals(data.pending);
		}*/

		// New logic added on 25-Sept
		if (parseFloat(data.balance) > 0) {
			data.AL_Exceeded = 'No';
		} else {
			data.AL_Exceeded = 'Yes';
		}
		if (data.Claim_Code !== 'HOSPS' && data.Claim_Code !== 'HOSPD') {
			data.Other_Cost = parseFloat(data.RECEIPT_AMOUNT) - parseFloat(data.Consultation_Fee) - parseFloat(data.Hospitalization_Fees) -
				parseFloat(data.wardCharges);
		}

		if (data.Other_Cost < 0) {
			data.Other_Cost = 0;
		}
		data.Other_Cost_disaply = parseFloat2Decimals(data.Other_Cost);
		//End

		//Ward days validation
		if (data.consumedWardDays == 0 && data.wardCharges > 0) {
			return req.reject({
				code: '422',
				message: `Please insert number of ward days`
			});
		}
		//End

		const coPayment = await tx.run(
			SELECT.from(Co_Payment).where({
				'CLAIM_CODE': data.Claim_Code,
				'CLINIC': data.Clinic,
				'MED_LEAVE_DECLAR': data.Med_Leave_Declar,
				'AL_EXCEEDED': data.AL_Exceeded
			})
		);

		if (coPayment.length === 0) {
			return req.reject({
				code: '422',
				message: `Clinic code selected is not eligible for this claim`
			});
		}

		// rouding rule
		const claimAdmin = await tx.run(
			SELECT.from(Benefit_Claim_Admin).where({
				Company: data.company,
				Claim_Code: data.Claim_Code,
				Claim_Category: data.Claim_Category,
				Start_Date: {
					'<=': data.claimDate
				},
				End_Date: {
					'>=': data.claimDate
				}
			})
		);

		//==================================================================
		//                     Begin: EFMR Validation
		//==================================================================
		if (data.Claim_Code.includes('_EFMR')) {
			if (coPayment.length > 0 && coPayment[0].Claim_Amount) {
				data.Claim_Amount = (data.Claim_Amount * coPayment[0].Claim_Amount) / 100;
			}
			if (coPayment.length > 0 && coPayment[0].CAP_AMOUNT_PERCLAIM) {
				if (parseFloat(data.Claim_Amount) > parseFloat(coPayment[0].CAP_AMOUNT_PERCLAIM)) {
					data.Claim_Amount = parseFloat(coPayment[0].CAP_AMOUNT_PERCLAIM);
				} else if (parseFloat(data.Claim_Amount) > parseFloat(data.balance)) {
					data.Claim_Amount = parseFloat(data.balance);
				}
			}
			if (coPayment.length > 0 && coPayment[0].CAP_AMOUNT_TOTAL) {
				if (parseFloat(data.Claim_Amount) > parseFloat(coPayment[0].CAP_AMOUNT_TOTAL)) {
					data.Claim_Amount = parseFloat(coPayment[0].CAP_AMOUNT_TOTAL);
				} else if (parseFloat(data.Claim_Amount) > parseFloat(data.balance)) {
					data.Claim_Amount = parseFloat(data.balance);
				}
			}
			//start change, KM request: round to 2 decimals
			data.Claim_Amount = (parseFloat(data.Claim_Amount) * 100000) / 100000;
			data.Claim_Amount = parseFloat2Decimals(data.Claim_Amount) < 0 ? '0.00' : parseFloat2Decimals(data.Claim_Amount);
			//end change, KM request
			return data;
		}
		//==================================================================
		//                     END: EFMR Validation
		//==================================================================

		//Leave approval validation 
		var approvedStstus = 'APPROVED';
		let leaveSQL = '';
		if (data.Med_Leave_Declar === 'Yes') {
			let receiptDate2 = dateFormat(new Date(new Date(data.receptDate).setDate(new Date(data.receptDate).getDate() + 1)));
			leaveSQL =
				`SELECT EXTERNALCODE,
                    APPROVALSTATUS,
                    STARTDATE,
                    ENDDATE,
                    TIMETYPE,
                    USERID
                FROM "SF_EMPLOYEETIME"
                WHERE USERID = ${data.employee} AND 
                ((STARTDATE  <= '${data.receptDate}' AND ENDDATE  >= '${data.receptDate}') OR 
                (STARTDATE  <= '${receiptDate2}' AND ENDDATE  >= '${receiptDate2}')) AND
                APPROVALSTATUS  = 'APPROVED' AND 
                TIMETYPE IN ('1022', '1021', '1021D', '1031', '1031D', 'PIL', 'PILH', '1173', '1174', '1175', '1176')`;

			const leavesData = await tx.run(leaveSQL);

			if (leavesData.length === 0) {
				return req.reject({
					code: '422',
					message: `Medical leave to be approved first before claim can be made`
				});
			}
		} else if (data.Med_Leave_Declar === 'No') {
			//data.Other_Cost = parseFloat2Decimals(data.Other_Cost) + parseFloat2Decimals(data.Consultation_Fee);
			//data.Consultation_Fee = 0;
		}
		//=================================================================================
		//							clinic type Gov A&E			
		//=================================================================================
		if (data.Clinic === 'AEG') {
			//data.Consultation_Fee = parseFloat2Decimals(data.Other_Cost) + parseFloat2Decimals(data.Consultation_Fee);
			//data.Other_Cost = 0;
		}

		//=================================================================================
		//									END
		//=================================================================================

		//YTD calculation
		let currentYear = data.claimDate.split('-')[0];
		let sdate = [currentYear, '01', '01'].join('-');
		let edate = [currentYear, '12', '31'].join('-');
		let TYDsql =
			`SELECT "EMPLOYEE_ID",
                    "CLAIM_CODE",
                    sum("CLAIM_AMOUNT")  takenClaim,
                    sum("CONSULTATION_FEE")  YTDConsultation,    
                    sum("OTHER_COST")  YTDOther,
                    sum("NO_OF_WARD_DAYS") as consumedWardDays,
                    sum("WARD_CHARGES") as wardCharges
                   FROM "BENEFIT_MEDICAL_CLAIM"
                    where "EMPLOYEE_ID" = ${data.employee} AND
                          "CLAIM_CODE" = '${data.Claim_Code}' AND
                          "CLAIM_DATE" BETWEEN '${sdate}' AND '${edate}'
                   GROUP BY 
                     "EMPLOYEE_ID",
                     "CLAIM_CODE"`;

		const TYDdata = await tx.run(TYDsql);
		if (TYDdata.length > 0) {
			if (!TYDdata[0].CONSUMEDWARDDAYS) {
				data.consumedWardDays = 0;
			} else {
				data.consumedWardDays = TYDdata[0].CONSUMEDWARDDAYS;
			}
			/*if (!TYDdata[0].WARDCHARGES) {
				data.wardCharges = 0;
			} else {
				data.wardCharges = TYDdata[0].WARDCHARGES
			}*/
			if (!TYDdata[0].YTDCONSULTATION) {
				data.YTDConsultation = 0;
			} else {
				data.YTDConsultation = TYDdata[0].YTDCONSULTATION;
			}
			if (!TYDdata[0].YTDOTHER) {
				data.YTDOthers = 0;
			} else {
				data.YTDOthers = TYDdata[0].YTDOTHER;
			}
		}

		if (!coPayment[0].Consultation_Fee) {
			coPayment[0].Consultation_Fee = 0;
		}
		if (!coPayment[0].Other_Cost) {
			coPayment[0].Other_Cost = 0;
		}
		if (!coPayment[0].Hospitalization_Fees) {
			coPayment[0].Hospitalization_Fees = 0;
		}
		if (!coPayment[0].WARD_CHARGES) {
			coPayment[0].WARD_CHARGES = 0;
		}
		if (!coPayment[0].CAP_AMOUNT_PERCLAIM) {
			coPayment[0].CAP_AMOUNT_PERCLAIM = 0;
		}
		if (!coPayment[0].CAP_AMOUNT_TOTAL) {
			coPayment[0].CAP_AMOUNT_TOTAL = 0;
		}

		if (data.Claim_Code === 'HOSPS' || data.Claim_Code === 'HOSPD') {
			if (parseFloat(data.RECEIPT_AMOUNT) < parseFloat(parseFloat(parseFloat(data.Consultation_Fee) + parseFloat(data.wardCharges)).toFixed(
					2))) {
				req.reject(400, `Please ensure receipt amount should be more than total cost of fees!`)
			}
			data.Hospitalization_Fees = parseFloat(data.RECEIPT_AMOUNT) - parseFloat(data.Consultation_Fee) - parseFloat(data.wardCharges);
			data.Hospitalization_Fees_Display = data.Hospitalization_Fees;
		} else {
			if (parseFloat(data.RECEIPT_AMOUNT) < parseFloat(parseFloat(parseFloat(data.Consultation_Fee) + parseFloat(data.wardCharges) +
					parseFloat(data.Hospitalization_Fees)).toFixed(2))) {
				req.reject(400, `Please ensure receipt amount should be equal or more than total cost of fees!`)
			}
		}

		data.Consultation_Fee = parseFloat(data.Consultation_Fee) * parseFloat(coPayment[0].Consultation_Fee) / 100;
		data.Other_Cost = parseFloat(data.Other_Cost) * parseFloat(coPayment[0].Other_Cost) / 100;
		data.Hospitalization_Fees = parseFloat(data.Hospitalization_Fees) * parseFloat(coPayment[0].Hospitalization_Fees) / 100;
		data.wardCharges = parseFloat(data.wardCharges) * parseFloat(coPayment[0].WARD_CHARGES) / 100;

		//============================================================================================
		//                            Othet Cost Capping
		//============================================================================================
		let interimBalance = parseFloat(data.balance) - parseFloat(data.Consultation_Fee);
		if (parseFloat(coPayment[0].CAP_AMOUNT_PERCLAIM) > 0) {
			if (interimBalance <= parseFloat(coPayment[0].CAP_AMOUNT_PERCLAIM) && parseFloat(data.Other_Cost) >=
				parseFloat(interimBalance)) {
				data.Other_Cost = interimBalance;
			} else if (interimBalance >= parseFloat(coPayment[0].CAP_AMOUNT_PERCLAIM) && parseFloat(data.Other_Cost) >=
				parseFloat(coPayment[0].CAP_AMOUNT_PERCLAIM)) {
				data.Other_Cost = parseFloat(coPayment[0].CAP_AMOUNT_PERCLAIM);
			}
		}
		if (data.Other_Cost < 0) {
			data.Other_Cost = 0;
		}

		// Rounding to three decimal places
		data.Claim_Amount = parseFloat(((parseFloat(data.Consultation_Fee) * 100000) + (parseFloat(data.Other_Cost) * 100000) + (parseFloat(data.Hospitalization_Fees) *
			100000)) / 100000).toFixed(3);

		if (parseFloat(coPayment[0].CAP_AMOUNT_TOTAL) > 0) {
			if (parseFloat(data.balance) <= parseFloat(coPayment[0].CAP_AMOUNT_TOTAL) && parseFloat(data.Claim_Amount) >=
				parseFloat(data.balance)) {
				data.Claim_Amount = data.balance;
			} else if (parseFloat(data.balance) >= parseFloat(coPayment[0].CAP_AMOUNT_TOTAL) && parseFloat(data.Claim_Amount) >=
				parseFloat(coPayment[0].CAP_AMOUNT_TOTAL)) {
				data.Claim_Amount = parseFloat(coPayment[0].CAP_AMOUNT_TOTAL);
			}
		}
		//Add by KM request
		data.Claim_Amount = parseFloat2Decimals(data.Claim_Amount);
		data.wardCharges = parseFloat2Decimals(data.wardCharges);

		//Add ward Charges after applying capping on Claim_Amount
		data.Claim_Amount = parseFloat(data.Claim_Amount) + parseFloat(data.wardCharges);

		//============================================================================================
		//                                      End
		//============================================================================================

		/*if (parseFloat2Decimals(coPayment[0].CAP_AMOUNT_TOTAL) > 0 && data.Claim_Amount > parseFloat2Decimals(coPayment[0].CAP_AMOUNT_TOTAL)) {
			data.Claim_Amount = parseFloat2Decimals(coPayment[0].CAP_AMOUNT_TOTAL);
		}*/

		if (data.Claim_Amount !== null && claimAdmin.length > 0 && claimAdmin[0].Entitlement_Rounding === 'Round down Nearest Dollar') {
			data.Claim_Amount = Math.floor(data.Claim_Amount);
		} else if (claimAdmin.length > 0 && claimAdmin[0].Entitlement_Rounding === '02 / Round Up Nearest Dollar') {
			data.Claim_Amount = Math.ceil(data.Claim_Amount);
		}

		if (parseFloat(coPayment[0].Consultation_Fee) === 100 && data.Med_Leave_Declar === 'Yes') {
			data.claimConsultation = parseFloat(data.Consultation_Fee);
			data.claimOtherCost = parseFloat(data.Claim_Amount) - parseFloat(data.wardCharges) - parseFloat(data.Consultation_Fee);
		} else {
			data.claimConsultation = 0;
			data.claimOtherCost = parseFloat(data.Claim_Amount) - parseFloat(data.wardCharges);
		}

		//============================================================================================
		//Sahas added parseFloat2Decimals as per Kit Mun in below code
		// if ((parseFloat2Decimals(data.CASH_AMOUNT) + parseFloat2Decimals(data.MEDISAVE_AMOUNT) +
		// 		parseFloat2Decimals(data.MEDISHIELD_AMOUNT) + parseFloat2Decimals(data.PRIVATE_INSURER_AMT)) === parseFloat2Decimals(data.RECEIPT_AMOUNT)) {} else {
		// 	req.reject(400, `Please ensure cash + medisave + medishield + private insurer amount = total receipt amount !`)
		// }
		if (parseFloat(parseFloat(parseFloat(data.CASH_AMOUNT) + parseFloat(data.MEDISAVE_AMOUNT) +
				parseFloat(data.MEDISHIELD_AMOUNT) + parseFloat(data.PRIVATE_INSURER_AMT)).toFixed(2)) === parseFloat(data.RECEIPT_AMOUNT)) {} else {
			req.reject(400, `Please ensure cash + medisave + medishield + private insurer amount = total receipt amount !`)
		}

		//Amount paid via Payroll
		if (parseFloat(data.CASH_AMOUNT) >= parseFloat(data.Claim_Amount)) {
			data.AMOUNT_PAID_VIA_PAYROLL = parseFloat(data.Claim_Amount);
		} else {
			data.AMOUNT_PAID_VIA_PAYROLL = parseFloat(data.CASH_AMOUNT)
		}
		//Amount Paid to Medisave
		if (parseFloat(data.MEDISAVE_AMOUNT) >= parseFloat(parseFloat(parseFloat(data.Claim_Amount) - parseFloat(data.AMOUNT_PAID_VIA_PAYROLL))
				.toFixed(2))) {
			data.AMOUNT_PAID_TOMEDISAVE = parseFloat(data.Claim_Amount) - parseFloat(data.AMOUNT_PAID_VIA_PAYROLL);
		} else {
			data.AMOUNT_PAID_TOMEDISAVE = parseFloat(data.MEDISAVE_AMOUNT);
		}

		//Amount Paid to Medishield
		if (parseFloat(data.MEDISHIELD_AMOUNT) >= parseFloat(parseFloat(parseFloat(data.Claim_Amount) - parseFloat(data.AMOUNT_PAID_VIA_PAYROLL) -
				parseFloat(data.AMOUNT_PAID_TOMEDISAVE)).toFixed(2))) {
			data.AMOUNT_PAID_TOMDEISHIELD = parseFloat(data.Claim_Amount) - parseFloat(data.AMOUNT_PAID_VIA_PAYROLL) -
				parseFloat(data.AMOUNT_PAID_TOMEDISAVE);
		} else {
			data.AMOUNT_PAID_TOMDEISHIELD = parseFloat(data.MEDISHIELD_AMOUNT);
		}
		//Amount Paid to Private Insurer 
		if (parseFloat(data.PRIVATE_INSURER_AMT) >= parseFloat(parseFloat(parseFloat(data.Claim_Amount) - parseFloat(data.AMOUNT_PAID_VIA_PAYROLL) -
				parseFloat(data.AMOUNT_PAID_TOMEDISAVE) - parseFloat(data.AMOUNT_PAID_TOMDEISHIELD)).toFixed(2))) {
			data.AMOUNT_PAID_TO_PRIVATE_INSURER = parseFloat(data.Claim_Amount) - parseFloat(data.AMOUNT_PAID_VIA_PAYROLL) -
				parseFloat(data.AMOUNT_PAID_TOMEDISAVE) - parseFloat(data.AMOUNT_PAID_TOMDEISHIELD);
		} else {
			data.AMOUNT_PAID_TO_PRIVATE_INSURER = parseFloat(data.PRIVATE_INSURER_AMT);
		}
		//======================================================================================
		//					if cash amount is gt 0			  
		//======================================================================================
		if (data.CASH_AMOUNT !== null && data.CASH_AMOUNT !== "") {
			data.CASH_AMOUNT = parseFloat(data.Claim_Amount);
		}

		//======================================================================================
		//									  END
		//======================================================================================
		// return othercost uncalculated
		data.Other_Cost = parseFloat2Decimals(data.Other_Cost_disaply);
		//Sahas Claim Amount zero
		// data.Claim_Amount = parseFloat2Decimals(data.Claim_Amount);
		data.Claim_Amount = parseFloat2Decimals(data.Claim_Amount) < 0 ? '0.00' : parseFloat2Decimals(data.Claim_Amount);
		//End Sahas Claim Amount zero
		data.AL_Wardday_Limit = parseFloat2Decimals(data.AL_Wardday_Limit);
		data.Claim_Amount = parseFloat2Decimals(data.Claim_Amount);
		data.Consultation_Fee = parseFloat2Decimals(data.Consultation_Fee);
		data.Other_Cost = parseFloat2Decimals(data.Other_Cost);
		data.Hospitalization_Fees = parseFloat2Decimals(data.Hospitalization_Fees);
		data.Hospitalization_Fees_Display = parseFloat2Decimals(data.Hospitalization_Fees_Display);
		data.eligibility = parseFloat2Decimals(data.eligibility);
		data.taken = parseFloat2Decimals(data.taken);
		data.pending = parseFloat2Decimals(data.pending);
		data.YTDConsultation = parseFloat2Decimals(data.YTDConsultation);
		data.YTDOthers = parseFloat2Decimals(data.YTDOthers);
		data.balance = parseFloat2Decimals(data.balance);
		data.CASH_AMOUNT = parseFloat2Decimals(data.CASH_AMOUNT);
		data.MEDISAVE_AMOUNT = parseFloat2Decimals(data.MEDISAVE_AMOUNT);
		data.MEDISHIELD_AMOUNT = parseFloat2Decimals(data.MEDISHIELD_AMOUNT);
		data.PRIVATE_INSURER_AMT = parseFloat2Decimals(data.PRIVATE_INSURER_AMT);
		data.RECEIPT_AMOUNT = parseFloat2Decimals(data.RECEIPT_AMOUNT);
		data.AMOUNT_PAID_VIA_PAYROLL = parseFloat2Decimals(data.AMOUNT_PAID_VIA_PAYROLL);
		data.AMOUNT_PAID_TOMEDISAVE = parseFloat2Decimals(data.AMOUNT_PAID_TOMEDISAVE);
		data.AMOUNT_PAID_TOMDEISHIELD = parseFloat2Decimals(data.AMOUNT_PAID_TOMDEISHIELD);
		data.AMOUNT_PAID_TO_PRIVATE_INSURER = parseFloat2Decimals(data.AMOUNT_PAID_TO_PRIVATE_INSURER);
		data.consumedWardDays = parseFloat2Decimals(data.consumedWardDays);
		data.wardCharges = parseFloat2Decimals(data.wardCharges);
		data.claimConsultation = parseFloat2Decimals(data.claimConsultation);
		data.claimOtherCost = parseFloat2Decimals(data.claimOtherCost);

		return data;

	});
	
	srv.on('getMultipleWrcClaimAmount', async (req) => {
		let result = await getWRCAmount(req, true);
		return result;
	});

	srv.on('getWrcClaimAmount', async(req) => {
		let result = await getWRCAmount(req);
		return result;
	});
	
	async function getWRCAmount(req, hasMultiple) {
		const tx = cds.transaction(req);
		let lineitems = (hasMultiple) ? req.data.lineItems : [req.data];
		let errorMessage = [], responseArr = [];
		for (let i = 0; i < lineitems.length; i++) {
			if (!lineitems[i].employeeId || !lineitems[i].claimCode || !lineitems[i].claimDate) {
				if (!hasMultiple) {
					return req.reject({
						code: '400',
						message: `Missing details.  Please check.`
					});
				} else {
					errorMessage.push(`Item ${i + 1}: Missing details.  Please check.`);
					continue;
				}
			}
			const claimUnit = (lineitems[i].claimUnit && parseInt(lineitems[i].claimUnit) > 0) ? parseInt(lineitems[i].claimUnit) : 1;
			let dayTypeCode, payGrade, result1, normalPHs, majorPHs, result3;
	
			result1 = await tx.run(
				`SELECT TOP 1 *
				 FROM "SF_EMPJOB" 
				 WHERE "USERID"='${lineitems[i].employeeId}' AND 
				 "STARTDATE"<='${dateFormat(lineitems[i].claimDate)}' AND 
				 "ENDDATE">='${dateFormat(lineitems[i].claimDate)}' ORDER BY "STARTDATE" DESC`
			);
	
			if (result1.length > 0) {
				payGrade = result1[0].PAYGRADE;
				if (!payGrade) {
					if (!hasMultiple) {
						return req.reject({
							code: '404',
							message: `Employee pay grade not found.`
						});
					} else {
						errorMessage.push(`Item ${i + 1}: Employee pay grade not found.`);
						continue;
					}
				}
				let claimDate2 = dateFormat(new Date(new Date(lineitems[i].claimDate).setDate(new Date(lineitems[i].claimDate).getDate() + 1)));
				majorPHs = await tx.run(
					`SELECT 
						"HOLIDAY" 
					FROM "SF_HOLIDAYASSIGNMENT" 
					WHERE ("DATE"='${dateFormat(lineitems[i].claimDate)}' OR
						  "DATE"='${claimDate2}') AND 
						  "HOLIDAY" IN ('Chinese_New_Year', 'New_Years_Day', 'Christmas_Day')`
				);
				normalPHs = await tx.run(
					SELECT.from(HolidayAssignment).where({
						'DATE': lineitems[i].claimDate
					})
				);
				const claimDay = new Date(lineitems[i].claimDate).getDay();
				result3 = await tx.run(
					`SELECT *
					 FROM "BENEFIT_WRC_CLAIM_TYPE"
					 WHERE "CLAIM_CODE"='${lineitems[i].claimCode}' AND
						  "PAY_GRADE"='${payGrade}' AND
						  "START_DATE" <= '${lineitems[i].claimDate}' AND
						  "END_DATE" >= '${lineitems[i].claimDate}'`
				);
				if (result3.length === 0) {
					if (!hasMultiple) {
						return req.reject({
							code: '400',
							message: `Invalid claim.  Please check claim code and claim date.`
						});
					} else {
						errorMessage.push(`Item ${i + 1}: Invalid claim.  Please check claim code and claim date.`);
						continue;
					}
				}
				let valid = false, finalResult;
				for (let i = 0; i < result3.length; i++) {
					switch(result3[i].DAY_TYPE_CODE) {
						case '1': // All days
							valid = true;
							break;
						case '2': // Mon to Fri
							if (claimDay !== 0 && claimDay !== 6) {
								valid = true;
							}
							break;
						case '3': // Weekend and PH
							if ((claimDay === 0 || claimDay === 6) || normalPHs.length > 0) {
								valid = true;
							}
							break;
						case '4': // Holiday Only
							if (normalPHs.length > 0) {
								valid = true;
							}
							break;
						case '5': // Mon to Thurs
							if (claimDay > 0 && claimDay < 5) {
								valid = true;
							}
							break;
						case '6': // Weekend, eve of Major PH or PH
							if ((claimDay === 0 || claimDay === 6) || (majorPHs.length > 0 || normalPHs.length > 0)) {
								valid = true;
							}
							break;
						case '7': // Weekend Only
							if (claimDay === 0 || claimDay === 6) {
								valid = true;
							}
							break;
					}
					if (valid) {
						finalResult = result3[i];
						break;
					}
				}
				if (valid) {
					finalResult.AMOUNT = parseFloat(finalResult.AMOUNT) * claimUnit;
					if (!hasMultiple) {
						return {
							claimDetails: finalResult
						};
					} else {
						responseArr.push(finalResult);
					}
				} else {
					return req.reject({
						code: '400',
						message: `Invalid claim.  Please check claim code and claim date`
					});
				}
			} else {
				if (!hasMultiple) {
					return req.reject({
						code: '404',
						message: `Employee not found.`
					});
				} else {
					errorMessage.push(`Item ${i + 1}: Employee not found.`);
					continue;
				}
			}
		}
		let returnObj = {
			lineitems: responseArr
		};
		return {
			data: JSON.stringify(returnObj),
			error: errorMessage.join('\n')
		};
	}

	srv.on('validateWRCClaimLineItem', async(req) => {
		let requestData = req.data,
			result1, result2;
		if (!requestData.employeeId || !requestData.department || !requestData.division || !requestData.locationRO || !requestData.lineItems) {
			return req.reject({
				code: '400',
				message: `Missing value in one of the attribute: "employeeId", "department", "division", "locationRO", "lineItems".`
			});
		}
		if (requestData.lineItems.length === 0) {
			return req.reject({
				code: '400',
				message: `Please provide at least one line item`
			});
		}
		let notFoundDates1 = [],
			notFoundDates2 = [],
			invalidLocationRO = [];
		const tx = cds.transaction(req);
		for (let i = 0; i < requestData.lineItems.length; i++) {
			result1 = await tx.run(
				`SELECT TOP 1
					"EMP_JOB"."DEPARTMENT",
					"EMP_JOB"."DIVISION"
				FROM "SF_EMPJOB" AS "EMP_JOB"
				WHERE "EMP_JOB"."USERID"='${requestData.employeeId}' AND "EMP_JOB"."STARTDATE" <= '${requestData.lineItems[i].claimDate}' ORDER BY "STARTDATE" DESC`
			);
			if (result1.length === 0 || !result1[0].DEPARTMENT || !result1[0].DIVISION) {
				notFoundDates1.push(requestData.lineItems[i].claimDate);
				continue;
			}

			console.log(result1);

			result2 = await tx.run(
				`SELECT
					"LOC_RO"."DEPARTMENT", 
					"LOC_RO"."DIVISION", 
					"LOC_RO"."LOCATION_RO_EMPLOYEEID"
				FROM "BENEFIT_LOCATION_RO" AS "LOC_RO"
				WHERE "LOC_RO"."DIVISION"='${result1[0].DIVISION}' AND "LOC_RO"."DEPARTMENT" = '${result1[0].DEPARTMENT}' AND 
					  "LOC_RO"."START_DATE" <= '${requestData.lineItems[i].claimDate}' AND "LOC_RO"."END_DATE" >= '${requestData.lineItems[i].claimDate}';`
			);
			if (result2.length === 0) {
				notFoundDates2.push(requestData.lineItems[i].claimDate);
				continue;
			}
			console.log(result2);

			let locationROExist = result2.find((item) => {
				return item.DIVISION === requestData.division &&
					item.DEPARTMENT === requestData.department &&
					item.LOCATION_RO_EMPLOYEEID === requestData.locationRO;
			});
			if (!locationROExist) {
				invalidLocationRO.push(requestData.lineItems[i].claimDate);
			}
		}
		let message = '';
		if (notFoundDates1.length > 0) {
			// message += `"Division" / "Department" not found for claim date: ${notFoundDates1.join(', ')}.`;
			message += 'Division/Department not found.';
		}

		if (notFoundDates2.length > 0) {
			// message += `"Location RO" not found for claim date: ${notFoundDates2.join(', ')}.`;
			message += 'Location RO not found.';
		}

		if (invalidLocationRO.length > 0) {
			message += `Selected Location RO does not match with claim date: ${invalidLocationRO.join(', ')}.`;
		}

		console.log(notFoundDates1, notFoundDates2, invalidLocationRO);

		if (message === '') {
			message = `Validation Successful`;
			return {
				message: message
			};
		} else {
			return req.reject({
				code: '404',
				message: message
			});
		}
	});

	srv.on('getLocationROs', async(req) => {
		let requestData = req.data,
			result1, result2;
		if (!requestData.employeeId || !requestData.submissionDate) {
			return req.reject({
				code: '400',
				message: `Missing value in one of the attribute: "employeeId", "submissionDate".`
			});
		}
		const tx = cds.transaction(req);
		result1 = await tx.run(
			`SELECT TOP 1
				"EMP_JOB"."DEPARTMENT",
				"EMP_JOB"."DIVISION"
			FROM "SF_EMPJOB" AS "EMP_JOB"
			INNER JOIN "SF_EMPEMPLOYMENT" EMPEMPLOY
			ON EMP_JOB."USERID" = EMPEMPLOY."PERSONIDEXTERNAL"
			WHERE "EMP_JOB"."USERID"='${requestData.employeeId}' AND "EMP_JOB"."STARTDATE" <= '${requestData.submissionDate}' AND "EMP_JOB"."ENDDATE" >= '${requestData.submissionDate}'
			and EMPEMPLOY."STARTDATE" <= '${requestData.submissionDate}'
		    and (EMPEMPLOY."ENDDATE" >= '${requestData.submissionDate}'
			or EMPEMPLOY."ENDDATE" IS NULL)
		    ORDER BY EMP_JOB."ENDDATE" DESC`
		);
		if (result1.length === 0 || !result1[0].DIVISION) {
			return req.reject({
				code: '404',
				message: `"Division" not found.`
			});
		}
		let querySubString = '';
		if (!result1[0].DEPARTMENT) {
			querySubString = `"LOC_RO"."DEPARTMENT" IS NULL AND `;
		} else {
			querySubString = `"LOC_RO"."DEPARTMENT" = '${result1[0].DEPARTMENT}' AND `;
		}
		let currentDate = dateFormat(new Date());
		result2 = await tx.run(
			`SELECT
				"LOC_RO"."DEPARTMENT", 
				"LOC_RO"."DIVISION", 
				"LOC_RO"."LOCATION_RO_EMPLOYEEID",
				"PER"."FIRSTNAME",
				"PER"."LASTNAME",
				"PER"."FULLNAME"
			FROM "BENEFIT_LOCATION_RO" AS "LOC_RO"
			INNER JOIN "SF_PERPERSONALVIEW" AS "PER"
			ON "LOC_RO"."LOCATION_RO_EMPLOYEEID" = "PER"."PERSONIDEXTERNAL"
			INNER JOIN "SF_EMPEMPLOYMENT" AS "EMPEMPLOY"
			ON "EMPEMPLOY"."PERSONIDEXTERNAL" = "LOC_RO"."LOCATION_RO_EMPLOYEEID"
			WHERE "LOC_RO"."DIVISION"='${result1[0].DIVISION}' AND ${querySubString} 
				  "LOC_RO"."START_DATE" <= '${requestData.submissionDate}' AND "LOC_RO"."END_DATE" >= '${requestData.submissionDate}'
				  AND "EMPEMPLOY"."STARTDATE" <= '${currentDate}'
			      AND ("EMPEMPLOY"."ENDDATE" >= '${currentDate}'
				  OR "EMPEMPLOY"."ENDDATE" IS NULL);`
		);
		if (result2.length === 0) {
			result2 = await tx.run(
				`SELECT
					"LOC_RO"."DEPARTMENT", 
					"LOC_RO"."DIVISION", 
					"LOC_RO"."LOCATION_RO_EMPLOYEEID",
					"PER"."FIRSTNAME",
					"PER"."LASTNAME",
					"PER"."FULLNAME"
				FROM "BENEFIT_LOCATION_RO" AS "LOC_RO"
				INNER JOIN "SF_PERPERSONALVIEW" AS "PER"
				ON "LOC_RO"."LOCATION_RO_EMPLOYEEID" = "PER"."PERSONIDEXTERNAL"
				INNER JOIN "SF_EMPEMPLOYMENT" AS "EMPEMPLOY"
				ON "EMPEMPLOY"."PERSONIDEXTERNAL" = "LOC_RO"."LOCATION_RO_EMPLOYEEID"
				WHERE "LOC_RO"."DIVISION"='${result1[0].DIVISION}' AND "LOC_RO"."DEPARTMENT" = 'N/A' AND 
					  "LOC_RO"."START_DATE" <= '${requestData.submissionDate}' AND "LOC_RO"."END_DATE" >= '${requestData.submissionDate}'
					  AND "EMPEMPLOY"."STARTDATE" <= '${currentDate}'
				      AND ("EMPEMPLOY"."ENDDATE" >= '${currentDate}'
					  OR "EMPEMPLOY"."ENDDATE" IS NULL);`
			);
			if (result2.length === 0) {
				return req.reject({
					code: '404',
					message: `Location RO not found.`
				});
			}
		}
		return result2;
	});

	srv.on('validateDuplicateWRCClaim', async(req) => {
		let requestData = req.data, validResults = [], errorClaimCodes = [], errorMessageSubStr = '';
		if (!requestData.employeeId || !requestData.claimCode || !requestData.claimDate || !requestData.claimCategory) {
			return req.reject({
				code: '400',
				message: `Missing value in one of the attribute: "employeeId", "claimCode", claimDate", "claimCategory".`
			});
		}
		if (requestData.claimCategory !== 'WRC' && requestData.claimCategory !== 'WRC_HR') {
			return req.reject({
				code: '400',
				message: `Invalid claim category. Only "WRC" and "WRC_HR" values are allowed.`
			});
		}
		let validationResult = await validateDuplicateWRCClaims(req);
		validResults = validationResult.validResults;
		errorClaimCodes = validationResult.errorClaimCodes;
		errorMessageSubStr = validationResult.errorMessageSubStr;
		
		let hasInvalid = validResults.find((item) => {
			return item === 'invalid';
		});
		if (hasInvalid) {
			let errMsgStr = '';
			if (errorClaimCodes.length > 0) {
				let uniqueErrorClaimCodes = errorClaimCodes.filter((item, i, ar) => ar.indexOf(item) === i);
				let claimCodesString = uniqueErrorClaimCodes.join(", ");
				errMsgStr += `${claimCodesString} ${errorMessageSubStr}`;
			}
			errMsgStr += ' Please try with different "Claim Code" / "Claim Date".';

			return req.reject({
				code: '422',
				message: errMsgStr
			});
		} else {
			return {
				message: `Validated successfully. No duplicate claim exists.`
			};
		}
	});

	srv.on('validateMultipleDuplicateWRCClaim', async(req) => {
		let requestData = req.data;
		let validResults = [], errorClaimCodes = [], errorMessageSubStr = '';
		const tx = cds.transaction(req);
		if (!requestData.claims) {
			return req.reject({
				code: '400',
				message: `Missing attribute: "claims".`
			});
		}
		let validationResult = await validateDuplicateWRCClaims(req, true);
		validResults = validationResult.validResults;
		errorClaimCodes = validationResult.errorClaimCodes;
		errorMessageSubStr = validationResult.errorMessageSubStr;

		let hasInvalid = validResults.find((item) => {
			return item === 'invalid';
		});
		if (hasInvalid) {
			let errMsgStr = '';
			if (errorClaimCodes.length > 0) {
				let uniqueErrorClaimCodes = errorClaimCodes.filter((item, i, ar) => ar.indexOf(item) === i);
				let claimCodesString = uniqueErrorClaimCodes.join(", ");
				errMsgStr += `${claimCodesString} ${errorMessageSubStr}`;
			}
			errMsgStr += ' Please try with different "Claim Code" / "Claim Date".';

			return req.reject({
				code: '422',
				message: errMsgStr
			});
		} else {
			return {
				message: `Validated successfully. No duplicate claim exists.`
			};
		}
	});
	
	async function validateDuplicateWRCClaims (req, isMultiple) {
		const tx = cds.transaction(req);
		let requestData, holidayResult = [], lowerDateThreshold, upperDateThreshold, claimDate, errorMessageSubStr = '';
		const validResults = [];
		if (isMultiple) {
			requestData = req.data;
		} else {
			requestData = {
				claims: [req.data]
			}
		}
		for (let j = 0; j < requestData.claims.length; j++) {
			if (!requestData.claims[j].employeeId || !requestData.claims[j].claimCode || !requestData.claims[j].claimDate || !requestData.claims[j].claimCategory) {
				return req.reject({
					code: '400',
					message: `Missing value in one of the attribute: "employeeId", "claimCode", claimDate", "claimCategory".`
				});
			}
			if (requestData.claims[j].claimCategory !== 'WRC' && requestData.claims[j].claimCategory !== 'WRC_HR') {
				return req.reject({
					code: '400',
					message: `Invalid claim category. Only "WRC" and "WRC_HR" values are allowed.`
				});
			}
			let claimCodesDB = [], claimCodesPayload = [], combinedClaimCodes = [], claimCodesUniqueSet1 = [], claimCodesUniqueSet2 = [];
			claimDate = dateFormat(new Date(requestData.claims[j].claimDate));
			lowerDateThreshold = dateFormat(new Date(new Date(requestData.claims[j].claimDate).getFullYear() + '/01/01'));
			upperDateThreshold = dateFormat(new Date(new Date(requestData.claims[j].claimDate).getFullYear() + '/12/31'));
			let claimReferenceSubStr = '';
			if (requestData.claims[j].claimReference) {
				claimReferenceSubStr = `"CLAIM_LINEITEM"."CLAIM_REFERENCE" != '${requestData.claims[j].claimReference}' AND `;
			}
			let masterTableName = 'BENEFIT_WRC_MASTER_CLAIM';
			let lineitemTableName = 'BENEFIT_WRC_LINEITEM_CLAIM';
			if (requestData.claims[j].claimCategory === "WRC_HR") {
				masterTableName = 'BENEFIT_WRC_HR_MASTER_CLAIM';
				lineitemTableName = 'BENEFIT_WRC_HR_LINEITEM_CLAIM';
			}
			let claimResult = await tx.run(
				`SELECT
					"CLAIM_LINEITEM".*,
					"CLAIM_MASTER"."CLAIM_STATUS"
				 FROM "${lineitemTableName}" AS "CLAIM_LINEITEM"
				 INNER JOIN "${masterTableName}" AS "CLAIM_MASTER"
				 ON "CLAIM_LINEITEM"."PARENT_CLAIM_REFERENCE" = "CLAIM_MASTER"."CLAIM_REFERENCE"
				 WHERE "CLAIM_LINEITEM"."EMPLOYEE_ID"='${requestData.claims[j].employeeId}' AND ${claimReferenceSubStr}
					  "CLAIM_MASTER"."CLAIM_STATUS" NOT IN ('Rejected', 'Cancelled', 'Cancellation Approved') AND
					  "CLAIM_LINEITEM"."CLAIM_DATE"='${claimDate}' AND 
					  "CLAIM_LINEITEM"."CLAIM_DATE" BETWEEN '${lowerDateThreshold}' AND '${upperDateThreshold}'`
			);
			// Below logic to get combined unique claim codes along with claim date from payload and DB
			claimResult.forEach((item) => {
				claimCodesDB.push(item.CLAIM_CODE);
			});
			requestData.claims.forEach((item) => {
				if (item.claimDate === requestData.claims[j].claimDate) {
					claimCodesPayload.push(item.claimCode);
				}
			});
			combinedClaimCodes = claimCodesDB.concat(claimCodesPayload);
			combinedClaimCodes.filter((claimCode) => {
				let i = claimCodesUniqueSet1.findIndex(value => (value === claimCode));
				if(i <= -1) {
					claimCodesUniqueSet1.push(claimCode);
					claimCodesUniqueSet2.push(claimCode);
				}
				return null;
			});
			// Validation 1: To allow valid claims with other claim codes on same day
			let indexesToDelete = [];
			for (let k = 0; k < claimCodesUniqueSet1.length; k++) {
				let validationConfigResult = await tx.run(
					`SELECT *
					 FROM "BENEFIT_WRC_CLAIM_VALIDATION_CONFIG" 
					 WHERE "CLAIM_CODE"='${claimCodesUniqueSet1[k]}' AND
						   "ALLOW_WITH_OTHER_CODE_SAME_DAY"='Yes'`
				);
				if (validationConfigResult.length > 0) {
					indexesToDelete.push(k);
				}
			}
			indexesToDelete = indexesToDelete.reverse();
			for (let l = 0; l < indexesToDelete.length; l++) {
				claimCodesUniqueSet1.splice(indexesToDelete[l], 1);
			}
			if (claimCodesUniqueSet1.length > 1) {
				validResults.push('invalid');
				return {
					validResults: validResults,
					errorMessageSubStr: 'already exists at given date.',
					errorClaimCodes: claimCodesUniqueSet1
				};
			}
			// Validation 2: To allow multiple claims on same day
			for (let m = 0; m < claimCodesUniqueSet2.length; m++) {
				let validationConfigResult = await tx.run(
					`SELECT *
					 FROM "BENEFIT_WRC_CLAIM_VALIDATION_CONFIG" 
					 WHERE "CLAIM_CODE"='${claimCodesUniqueSet2[m]}' AND
						   "ALLOW_MULTIPLE_CODE_SAME_DAY"='Yes'`
				);
				let multipleClaimCodesExist = combinedClaimCodes.filter((claimCode) => {
					return claimCode === claimCodesUniqueSet2[m];
				});
				if (validationConfigResult.length === 0 && multipleClaimCodesExist.length > 1) {
					validResults.push('invalid');
					return {
						validResults: validResults,
						errorMessageSubStr: 'are not allowed multiple in same date.',
						errorClaimCodes: multipleClaimCodesExist
					};
				}
			}
			
			// Validation 3: WRCPHNONWD special condition
			if (requestData.claims[j].claimCode === 'WRCPHNONWD') {
				holidayResult = await tx.run(
					SELECT.from(HolidayAssignment).where({
						'DATE': requestData.claims[j].claimDate
					})
				);
				if (holidayResult.length === 0 || new Date(requestData.claims[j].claimDate).getDay() !== 6) {
					validResults.push('invalid');
					return {
						validResults: validResults,
						errorMessageSubStr: `is invalid claim.`,
						errorClaimCodes: [requestData.claims[j].claimCode]
					};
				}
			}
		}
		validResults.push('valid');
		return {
			validResults: validResults,
			errorMessageSubStr: errorMessageSubStr,
			errorClaimCodes: [],
		};
	}
	
	srv.on('validateMultipleClaimSubmission', async (req) => {
		let requestData = req.data;
		let reqMessage = 'Successfully Validated.';
		let errorResults = [];
		if (!requestData.claims) {
			return req.reject({
				code: '400',
				message: `Missing attribute: "claims".`
			});
		}
		if (requestData.claims.length === 0) {
			return {
				message: reqMessage
			};
		}
		for (let i = 0; i < requestData.claims.length; i++) {
			let claim = requestData.claims[i];
			let validation1 = await validateClaimDateAndReceiptDateAndInvoiceDate(req, true, claim);
			if (claim.isMode == 'X') {
				var validation2 = await validateReceiptNumberAndInvoiceNumber(req, true, claim);
			} else {
				var validation2 = {
					valid: true
				};
			}
			if (!validation1.valid) {
				errorResults.push(`Item ${i + 1}: ${claim.claimCode} - ${validation1.message}`);
			} else if (!validation2.valid) {
				errorResults.push(`Item ${i + 1}: ${claim.claimCode} - ${validation2.message}`);
			}
		}
		if (errorResults.length > 0) {
			if (errorResults.length === 1) {
				reqMessage = errorResults.join('');
			} else {
				reqMessage = errorResults.join(' \n ');
			}
			return req.reject({
				code: '422',
				message: reqMessage
			});
		} else {
			return {
				message: reqMessage
			};
		}
	});

	srv.on('validateClaimSubmission', async(req) => {
		const validation1 = await validateClaimDateAndReceiptDateAndInvoiceDate(req);
		// Sahas Code to Skip Receipt Number Validation on Mode 'X'
		if (req.data.isMode == 'X') {
			var validation2 = await validateReceiptNumberAndInvoiceNumber(req);
		} else {
			var validation2 = {
				valid: true
			};
		}
		// End Sahas Code to Skip Receipt Number Validation on Mode 'X'
		if (!validation1.valid) {
			return req.reject({
				code: validation1.code,
				message: validation1.message
			});
		} else if (!validation2.valid) {
			return req.reject({
				code: validation2.code,
				message: validation2.message
			});
		} else {
			return {
				message: validation1.message
			}
		}
	});

	async function validateClaimDateAndReceiptDateAndInvoiceDate(req, hasMultiple, claimData) {
		let requestData = (hasMultiple) ? claimData : req.data,
			result1;
		if (!requestData.claimCode && !requestData.receiptDate) {
			return {
				valid: true,
				code: '200',
				message: `Successfully Validated.`
			};
		}
		if (!requestData.claimDate || !requestData.employeeId) {
			return {
				valid: false,
				code: '400',
				message: `Missing value in one of the attribute: "claimDate", "employeeId".`
			};
		}
		let claimDateStr;
		if (requestData.invoiceDate) {
			claimDateStr = dateFormat(requestData.claimDate);
		} else {
			claimDateStr = (requestData.receiptDate) ? dateFormat(requestData.receiptDate) : dateFormat(requestData.claimDate);
		}
		const tx = cds.transaction(req);
		
		let empJobResult = await tx.run(`
			SELECT
				"COMPANY"
			FROM "SF_EMPJOB"
			WHERE "USERID"='${requestData.employeeId}' AND
				  "STARTDATE" <= '${claimDateStr}' AND
				  "ENDDATE" >= '${claimDateStr}'
			ORDER BY "STARTDATE" DESC
		`);
		
		if (empJobResult.length === 0 || (empJobResult.length > 0 && !empJobResult[0].COMPANY)) {
			return {
				valid: false,
				code: '404',
				message: `Company not found.`
			};
		} else {
			empJobResult = empJobResult[0];
		}

		let query =
			`SELECT
				"CLAIM_CODE",
				"PERIOD_NUMBER",
				"PERIOD_UNITS"
			FROM "BENEFIT_BENEFIT_CLAIM_ADMIN"
			WHERE "CLAIM_CODE"='${requestData.claimCode}' AND 
				  "COMPANY"='${empJobResult.COMPANY}' AND 
				(("START_DATE"<='${claimDateStr}' AND "END_DATE">='${claimDateStr}')`;
		/*if (requestData.receiptDate) {
			const receiptDateStr = dateFormat(requestData.receiptDate);
			query += ` AND ("START_DATE"<='${receiptDateStr}' AND "END_DATE">='${receiptDateStr}')`;
		}*/
		query += `)`;
		result1 = await tx.run(query);
		if (result1.length === 0) {
			return {
				valid: false,
				code: '404',
				message: `Invalid claim.  Please check claim code and claim date`
			};
		}
		if (!result1[0].PERIOD_NUMBER || !result1[0].PERIOD_UNITS) {
			return {
				valid: false,
				code: '422',
				message: `"Period Number"/"Period Unit" is not maintained correctly for "${requestData.claimCode}"`
			};
		}
		if (result1[0].PERIOD_NUMBER === 'N/A' || result1[0].PERIOD_UNITS === 'N/A') {
			return {
				valid: true,
				code: '200',
				message: `Successfully Validated.`
			};
		}
		let startDate = new Date(),
			claimDate = new Date(requestData.claimDate),
			receiptDate = (requestData.receiptDate) ? new Date(requestData.receiptDate) : null,
			invoiceDate = (requestData.invoiceDate) ? new Date(requestData.invoiceDate) : null,
			submissionDate = new Date();
		if (requestData.isApprover === 'X') {
			let claimRefer = (hasMultiple) ? requestData.masterClaimReference : requestData.claimReference;
			let submissionDateResult = await tx.run(
				`SELECT 
					"SUBMIT_DATE"
				 FROM "BENEFIT_CLAIM_STATUS"
				 WHERE "CLAIM_REFERENCE"='${claimRefer}'`
			);
			if (submissionDateResult.length > 0 && submissionDateResult[0].SUBMIT_DATE) {
				startDate = new Date(submissionDateResult[0].SUBMIT_DATE);
				submissionDate = new Date(submissionDateResult[0].SUBMIT_DATE);
			}
		}
		switch (result1[0].PERIOD_UNITS) {
		case "Days":
			startDate = new Date(startDate.setDate(startDate.getDate() - parseInt(result1[0].PERIOD_NUMBER)));
			break;
		case "Week":
			startDate = new Date(startDate.setDate(startDate.getDate() - (parseInt(result1[0].PERIOD_NUMBER) * 7)));
			break;
		case "Month":
			startDate = new Date(startDate.setMonth(startDate.getMonth() - parseInt(result1[0].PERIOD_NUMBER)));
			break;
		}
		startDate = new Date(startDate.setDate(startDate.getDate() + 1));

		let employmentDetails = await tx.run(
			`SELECT 
				*
			 FROM "SF_EMPEMPLOYMENT"
			 WHERE "PERSONIDEXTERNAL"='${requestData.employeeId}' ORDER BY "STARTDATE" DESC`
		);

		if (employmentDetails.length === 0) {
			return {
				valid: false,
				code: '404',
				message: `Employment details not found`
			};
		}

		employmentDetails = employmentDetails[0];
		if (!employmentDetails.ENDDATE) {
			employmentDetails.ENDDATE = '9999-12-31 00:00:00'
		}
		var employmentStartDate = new Date(employmentDetails.STARTDATE),
			employmentEndDate = new Date(employmentDetails.ENDDATE);
			
		if (requestData.invoiceDate) {
			if (invoiceDate < employmentStartDate || invoiceDate > employmentEndDate) {
				return {
					valid: false,
					code: '422',
					message: `Invoice date outside of employment period`
				};
			}
			if ((invoiceDate && invoiceDate >= startDate && invoiceDate <= submissionDate) ||
				requestData.isHr == 'X') {
				return {
					valid: true,
					code: '200',
					message: `Successfully Validated.`
				};
			} else {
				return {
					valid: false,
					code: '422',
					// message: `Submission not allowed for "${requestData.claimCode}" for given claim date. Please try with different claim date which should be in between ${startDate} and ${submissionDate}.`
					message: 'Submission rejected as exceeded claim eligible period'
				};
			}
		} else if (requestData.receiptDate) {
			if (receiptDate < employmentStartDate || receiptDate > employmentEndDate) {
				return {
					valid: false,
					code: '422',
					message: `Receipt date outside of employment period`
				};
			}
			if ((receiptDate && receiptDate >= startDate && receiptDate <= submissionDate) ||
				requestData.isHr == 'X') {
				return {
					valid: true,
					code: '200',
					message: `Successfully Validated.`
				};
			} else {
				return {
					valid: false,
					code: '422',
					// message: `Submission not allowed for "${requestData.claimCode}" for given claim date. Please try with different claim date which should be in between ${startDate} and ${submissionDate}.`
					message: 'Submission rejected as exceeded claim eligible period'
				};
			}
		} else {
			if (claimDate < employmentStartDate || claimDate > employmentEndDate) {
				return {
					valid: false,
					code: '422',
					message: `Claim date outside of employment period`
				};
			}
			if ((claimDate >= startDate && claimDate <= submissionDate) || requestData.isHr == 'X') {
				return {
					valid: true,
					code: '200',
					message: `Successfully Validated.`
				};
			} else {
				return {
					valid: false,
					code: '422',
					message: 'Submission rejected as exceeded claim eligible period'
						// message: `Submission not allowed for "${requestData.claimCode}" for given claim date. Please try with different claim date which should be in between ${startDate} and ${submissionDate}.`
				};
			}
		}
	}

	async function validateReceiptNumberAndInvoiceNumber(req, hasMultiple, claimData) {
		let requestData = (hasMultiple) ? claimData : req.data;
		let receiptNumber = requestData.receiptNumber,
			invoiceNumber = requestData.invoiceNumber,
			claimReference = requestData.claimReference,
			employeeId = requestData.employeeId,
			invoiceDate = requestData.invoiceDate,
			result1, result2;
		if (hasMultiple && invoiceNumber) {
			let invoiceNumbers = req.data.claims.filter((item) => {
		        return item.invoiceNumber.toString().toUpperCase() === invoiceNumber.toString().toUpperCase() && item.invoiceDate === invoiceDate && item.employeeId === employeeId;
		    });
		    if (invoiceNumbers.length > 1) {
		    	return {
					valid: false,
					code: '422',
					message: `Duplicate invoice number`
				};
		    }
		}
		const tx = cds.transaction(req);
		if (invoiceNumber || receiptNumber) {
			let tableWithoutLineItem = [], tableWithLineItem = [];
			if (receiptNumber) {
				tableWithoutLineItem = [
					'BENEFIT_AHP_LIC_MS_WIC_CLAIM',
					'BENEFIT_PC_CLAIM',
					'BENEFIT_PTF_ACL_BCL_CLAIM',
					"BENEFIT_MEDICAL_CLAIM"
				],
				tableWithLineItem = [{
					masterTable: 'BENEFIT_COV_MASTER_CLAIM',
					lineItemTable: 'BENEFIT_COV_LINEITEM_CLAIM'
				}, {
					masterTable: 'BENEFIT_SP_MASTER_CLAIM',
					lineItemTable: 'BENEFIT_SP_LINEITEM_CLAIM'
				}, {
					masterTable: 'BENEFIT_SP1_MASTER_CLAIM',
					lineItemTable: 'BENEFIT_SP1_LINEITEM_CLAIM'
				}, {
					masterTable: 'BENEFIT_SP2_MASTER_CLAIM',
					lineItemTable: 'BENEFIT_SP2_LINEITEM_CLAIM'
				}, {
					masterTable: 'BENEFIT_SP3_MASTER_CLAIM',
					lineItemTable: 'BENEFIT_SP3_LINEITEM_CLAIM'
				}, {
					masterTable: 'BENEFIT_TC_MASTER_CLAIM',
					lineItemTable: 'BENEFIT_TC_LINEITEM_CLAIM'
				}];
			} else if (invoiceNumber) {
				tableWithLineItem = [{
					masterTable: 'BENEFIT_OC_MASTER_CLAIM',
					lineItemTable: 'BENEFIT_OC_LINEITEM_CLAIM'
				}, {
					masterTable: 'BENEFIT_CPC_MASTER_CLAIM',
					lineItemTable: 'BENEFIT_CPC_LINEITEM_CLAIM'
				}, {
					masterTable: 'BENEFIT_PAY_UP_MASTER_CLAIM',
					lineItemTable: 'BENEFIT_PAY_UP_LINEITEM_CLAIM'
				}, {
					masterTable: 'BENEFIT_SDFC_MASTER_CLAIM',
					lineItemTable: 'BENEFIT_SDFC_LINEITEM_CLAIM'
				}];
			}
			
			let claimReferenceSubStr = '';
			if (claimReference) {
				claimReferenceSubStr = `"CLAIM_REFERENCE" != '${claimReference}' AND `;
			}
			let msgSubStr = (receiptNumber) ? 'receipt' : 'invoice';
			let querySubStr1 = (receiptNumber) ? `UPPER("RECEIPT_NUMBER") LIKE UPPER('${receiptNumber}')` : `UPPER("INVOICE_NUMBER") LIKE UPPER('${invoiceNumber}') AND "EMPLOYEE_ID"='${employeeId}' AND "INVOICE_DATE"='${invoiceDate}' `;
			for (let i = 0; i < tableWithoutLineItem.length; i++) {
				result1 = await tx.run(
					`SELECT 
						"CLAIM_REFERENCE"
					FROM "${tableWithoutLineItem[i]}"
					WHERE ${claimReferenceSubStr} ${querySubStr1} AND 
						  "CLAIM_STATUS"!='Rejected' AND 
						  "CLAIM_STATUS"!='Cancelled' AND 
						  "CLAIM_STATUS"!='Cancellation Approved' AND 
						  "CLAIM_STATUS" NOT LIKE 'Cancellation Pending for approval%'`
				);
				if (result1.length > 0) {
					return {
						valid: false,
						code: '422',
						message: `Duplicate ${msgSubStr} number`
					}
				}
			}
			let claimReferenceLineItemSubStr = '';
			if (claimReference) {
				claimReferenceLineItemSubStr = `"CLAIM_LINEITEM"."CLAIM_REFERENCE" != '${claimReference}' AND `;
			}
			let querySubStr2 = (receiptNumber) ? `UPPER("CLAIM_LINEITEM"."RECEIPT_NUMBER") LIKE UPPER('${receiptNumber}')` : `UPPER("CLAIM_LINEITEM"."INVOICE_NUMBER") LIKE UPPER('${invoiceNumber}') AND "CLAIM_LINEITEM"."EMPLOYEE_ID"='${employeeId}' AND "CLAIM_LINEITEM"."INVOICE_DATE"='${invoiceDate}' `;
			for (let j = 0; j < tableWithLineItem.length; j++) {
				let querySubString = querySubStr2;
				if (tableWithLineItem[j].masterTable === 'BENEFIT_PAY_UP_MASTER_CLAIM') {
					querySubString = querySubStr2.replace(`"EMPLOYEE_ID"`, `"SCHOLAR_ID"`);
				}
				result2 = await tx.run(
					`SELECT
						"CLAIM_LINEITEM"."CLAIM_REFERENCE"
					 FROM "${tableWithLineItem[j].lineItemTable}" AS "CLAIM_LINEITEM"
					 INNER JOIN "${tableWithLineItem[j].masterTable}" AS "CLAIM_MASTER"
					 ON "CLAIM_LINEITEM"."PARENT_CLAIM_REFERENCE" = "CLAIM_MASTER"."CLAIM_REFERENCE"
					 WHERE ${claimReferenceLineItemSubStr} ${querySubString} AND
						  "CLAIM_MASTER"."CLAIM_STATUS"!='Rejected' AND
						  "CLAIM_MASTER"."CLAIM_STATUS"!='Cancelled' AND 
						  "CLAIM_MASTER"."CLAIM_STATUS"!='Cancellation Approved' AND 
						  "CLAIM_STATUS" NOT LIKE 'Cancellation Pending for approval%'`
				);
				if (result2.length > 0) {
					return {
						valid: false,
						code: '422',
						message: `Duplicate ${msgSubStr} number`
					}
				}
			}
		}
		return {
			valid: true,
			code: '200',
			message: `Successfully Validated.`
		}
	}

	srv.on('validatePublicHolidayClaim', async(req) => {
		let requestData = req.data,
			result1;
		if (!requestData.claimCode || !requestData.claimDate) {
			return req.reject({
				code: '400',
				message: `Missing value in one of the attribute: "claimCode", claimDate".`
			});
		}
		const tx = cds.transaction(req);
		if (requestData.claimCode === 'TSOTC_PH' || requestData.claimCode === 'WRCWKONPH' || requestData.claimCode === 'WRCPHNONWD') {
			result1 = await tx.run(
				SELECT.from(HolidayAssignment).where({
					'DATE': requestData.claimDate
				})
			);
			if (result1.length > 0) {
				return {
					message: `Successfully Validated.`
				}
			} else {
				return req.reject({
					code: '422',
					message: `Invalid claim.  Please check claim code and claim date`
				});
			}
		} else {
			return req.reject({
				code: '422',
				message: `Invalid claim.  Please check claim code and claim date`
			});
		}
	});

	srv.on('calculateCoPayment', async(req) => {
		let requestData = req.data,
			result1;
		if (!requestData.claimCode || !requestData.claimAmount) {
			return req.reject({
				code: '400',
				message: `Missing value in one of the attribute: "claimCode", claimAmount".`
			});
		}
		const tx = cds.transaction(req);
		result1 = await tx.run(
			SELECT.from(Co_Payment).where({
				'CLAIM_CODE': requestData.claimCode
			})
		);

		if (result1.length === 0) {
			//SAHAS added as per KitMun
			if (requestData.balance != null && requestData.balance != '' && requestData.balance != undefined && requestData.claimCode === 'PTF') {
				if (parseFloat(requestData.claimAmount) > parseFloat(requestData.balance)) {
					return {
						claimAmount: requestData.balance
							// masterClaimAmount: 0
					};
				}
			}
			//SAHAS added as per KitMun
			return {
				claimAmount: requestData.claimAmount
					// masterClaimAmount: 0
			};
		}
		let claimAmountPercentage = parseFloat(result1[0].Claim_Amount),
			capAmountPerClaim = parseFloat(result1[0].CAP_AMOUNT_PERCLAIM),
			capAmountTotal = parseFloat(result1[0].CAP_AMOUNT_TOTAL),
			requestedClaimAmount = parseFloat(requestData.claimAmount),
			calculatedAmount = 0;
		if (!claimAmountPercentage || claimAmountPercentage === 0) {
			return {
				claimAmount: 0
					// masterClaimAmount: (capAmountTotal) ? capAmountTotal : 0
			};
		}
		calculatedAmount = requestedClaimAmount * (claimAmountPercentage / 100);
		if (capAmountPerClaim > 0 && calculatedAmount > capAmountPerClaim) {
			calculatedAmount = capAmountPerClaim;
		}

		if (capAmountTotal > 0 && calculatedAmount > capAmountTotal) {
			calculatedAmount = capAmountTotal;
		}
		//SAHAS added as per KitMun
		if (requestData.balance != null && requestData.balance != '' && requestData.balance != undefined && requestData.claimCode === 'PTF') {
			if (parseFloat(requestData.claimAmount) > parseFloat(requestData.balance)) {
				return {
					claimAmount: requestData.balance
						// masterClaimAmount: 0
				};
			}
		}
		//SAHAS added as per KitMun
		return {
			claimAmount: calculatedAmount
				// masterClaimAmount: (capAmountTotal) ? capAmountTotal : 0
		};
	});

	srv.after(['READ'], 'EmployeeEligibility', async(result, req) => {
		try {
			const tx = cds.transaction(req);
			const result1 = await tx.run(
				SELECT.from(PerPersonRelationship).where({
					'PERSONIDEXTERNAL': req.params[0].UserID,
					'CUSTOMSTRING6': 'Yes'
				})
			);
			const eligibleClaimResult = await tx.run(
				`SELECT
					"CLAIM_CODE",
					"SEQUENCE"
				FROM "SF_DISTINCTEMPLOYEEELIGIBILITY"('${req.params[0].UserID}');`
			);
			const empCompRecurringResult = await tx.run(
				`SELECT
					"PAYCOMPVALUE"
				FROM "SF_EMPPAYCOMPRECURRING"
				WHERE "USERID"='${req.params[0].UserID}' AND "PAYCOMPONENT"='1002'`
			);
			let hasEntitlementAdded = false;
			for (let i = 0; i < eligibleClaimResult.length; i++) {
				const claimCodeFromDependent = await tx.run(
					SELECT('Claim_Code').from(Benefit_Claim_Admin).where({
						'Dependent_Claim_Code': eligibleClaimResult[i].CLAIM_CODE
					})
				);
				let filteredResultClaimCode;
				if (claimCodeFromDependent.length > 0) {
					filteredResultClaimCode = result.find((item) => {
						return item.Claim_Code === claimCodeFromDependent[0].Claim_Code;
					});
					if (!filteredResultClaimCode) {
						filteredResultClaimCode = {
							Claim_Code: claimCodeFromDependent[0].Claim_Code
						};
					}
				} else {
					filteredResultClaimCode = result.find((item) => {
						return item.Claim_Code === eligibleClaimResult[i].CLAIM_CODE;
					});
				}
				if (filteredResultClaimCode) {
					const result2 = await tx.run(
						SELECT('Dependent_Claim_Code').from(Benefit_Claim_Admin).where({
							'Claim_Code': filteredResultClaimCode.Claim_Code
						})
					);
					if (result2.length > 0 && result2[0].Dependent_Claim_Code) {
						if (!hasEntitlementAdded && filteredResultClaimCode.Claim_Code === 'OPTS') {
							let dependentClaimResult = [];
							const dependentClaimCode = eligibleClaimResult.find((item) => {
								return item.CLAIM_CODE === result2[0].Dependent_Claim_Code;
							});
							if (dependentClaimCode) {
								dependentClaimResult = await tx.run(
									SELECT('Entitlement').from(Benefit_Eligibility).where({
										'Claim_Code': dependentClaimCode.CLAIM_CODE,
										'Sequence': dependentClaimCode.SEQUENCE
									})
								);
							}
							if (dependentClaimResult.length > 0) {
								if (dependentClaimResult[0].Entitlement && dependentClaimResult[0].Entitlement !== '-') {
									if (filteredResultClaimCode.Entitlement && filteredResultClaimCode.Entitlement !== '-' && parseFloat(filteredResultClaimCode.Entitlement) !==
										0) {
										let entitlementSum = parseFloat(filteredResultClaimCode.Entitlement) + parseFloat(dependentClaimResult[0].Entitlement);
										filteredResultClaimCode.Entitlement = entitlementSum.toString();
									}
									// else {
									//		filteredResultClaimCode.Entitlement = dependentClaimResult[0].Entitlement;
									// }
									hasEntitlementAdded = true;
								}
							}
						}

						if (result1.length === 0 || (result1.length > 0 && !(result1[0].customString6 === "Yes"))) {
							let dependentClaimCodeIndex = result.findIndex((item) => {
								return item.Claim_Code === result2[0].Dependent_Claim_Code;
							});
							if (dependentClaimCodeIndex !== -1) {
								result.splice(dependentClaimCodeIndex, 1);
							}
						}
					}
					if (filteredResultClaimCode && filteredResultClaimCode.Basic_Pay && filteredResultClaimCode.Basic_Pay !== 'NA' &&
						empCompRecurringResult.length > 0 && empCompRecurringResult[0].PAYCOMPVALUE &&
						parseFloat(empCompRecurringResult[0].PAYCOMPVALUE) > parseFloat(filteredResultClaimCode.Basic_Pay)) {
						let claimCodeIndex = result.findIndex((item) => {
							return item.Claim_Code === filteredResultClaimCode.Claim_Code;
						});
						if (claimCodeIndex !== -1) {
							result.splice(claimCodeIndex, 1);
						}
					}
				}
			}
			return result;
		} catch (error) {
			console.log(error)
			req.reject(error);
		}

	});
	//===========================================================
	//  Begin: RingFencing Report
	//===========================================================
	const calculateProration = async(tx, userID, year, claimCode, claimCategory, Entitlement) => {
		//userID = '47007321';
		var employeeDetails = await tx.run(SELECT.from(EmpEmployment).where({
			userId: userID
		}));

		if (employeeDetails.length > 0) {
			if (employeeDetails[0].endDate == null) {
				employeeDetails[0].endDate = new Date(year, 11, 31);
				employeeDetails[0].endDate = dateFormat(employeeDetails[0].endDate);
			}
			var empJob = await tx.run(SELECT.from(EmpJobPartTime).where({
				userId: userID
			}));
		} else {
			return {
				"type": "E",
				"message": "employee details are not available",
				"value": null
			}
		}

		employeeDetails[0].partTime = false;
		employeeDetails[0].permanent = false;

		let yearEnd = [year, '12', '31'].join("-"); //dateFormat(year, 11, 31);
		let yearStart = [year, '01', '01'].join("-"); //dateFormat(year, 01, 01);

		/*var empJob = await tx.run(SELECT.from(EmpJobPartTime).where({
		    userId: userID
		})); */

		var empJob =
			`SELECT * FROM "SF_EMPJOB"
                    WHERE USERID = '${userID}' AND
                        STARTDATE >= '${employeeDetails[0].startDate}' AND ENDDATE <= '${employeeDetails[0].endDate}'
                    ORDER BY seqNumber DESC`;
		let resEmpJob = await tx.run(empJob);
		if (resEmpJob.length <= 0) {
			return {
				"type": "E",
				"message": "Employee data not found",
				"value": null

			}
		}
		resEmpJob.forEach(function (data) {
			var partTime = ['CP', 'PP', 'PT'];
			if (partTime.includes(data.EMPLOYEETYPE)) {
				employeeDetails[0].partTime = true;
			} else {
				employeeDetails[0].permanent = true;
			}
		});

		var Benefit_Entitlement = await tx.run(SELECT.from(Benefit_Entitlement_Adjust).where({
			emp_Id: userID,
			Claim_code: claimCode,
			Year: year
		}));

		var GV_BenefitAdjust = 0.0;
		if (Benefit_Entitlement.length > 0) {
			Benefit_Entitlement = Benefit_Entitlement[0];
			GV_BenefitAdjust = parseFloat(Benefit_Entitlement.Adjustment);
		}
		var claimAdmin = await tx.run(SELECT.from(Benefit_Claim_Admin).where({
			Claim_Code: claimCode,
			Claim_Category: claimCategory,
			Start_Date: {
				'<=': yearStart
			},
			End_Date: {
				'>=': yearEnd
			}
		}));

		if (claimAdmin.length > 0) {
			claimAdmin = claimAdmin[0];
		} else {
			return {
				"type": "E",
				"message": "Claim info not found",
				"value": null

			}
		}

		if (employeeDetails[0].partTime && employeeDetails[0].permanent) {
			var work = regularEmpCalculation(claimAdmin, employeeDetails[0], "");
			// Part Time 
			var Entitlement1 = 0.0;
			if (resEmpJob.length > 0) {
				empJob = resEmpJob[0];
				// console.log("company", empJob);
				var FOLocation = await tx.run(SELECT.from(v_FOLocation).where({
					externalCode: empJob.COMPANY
				}));

				if (FOLocation.length > 0) {
					var work1 = partTimeCalculation(FOLocation, claimAdmin, employeeDetails[0], NoPayLeave, resEmpJob);
					Entitlement1 = work1 * Entitlement;
				} else {
					//return "Employee data not found";
					return {
						"type": "E",
						"message": "Employee data not found",
						"value": null
					}
				}
			} else {
				return {
					"type": "E",
					"message": "Employee data not found",
					"value": null

				}
			}
			//return (work * req.data.Entitlement) + Entitlement + GV_BenefitAdjust;
			return {
				"type": "S",
				"value": (work * Entitlement) + Entitlement1 + GV_BenefitAdjust,
				"message": null
			}
		} else if (employeeDetails[0].permanent) {
			var work = regularEmpCalculation(claimAdmin, employeeDetails[0], "");
			//return (work * req.data.Entitlement) + GV_BenefitAdjust;
			return {
				"type": "S",
				"value": (work * Entitlement) + GV_BenefitAdjust,
				"message": null
			}
		} else if (employeeDetails[0].partTime) {
			if (resEmpJob.length > 0) {
				empJob = resEmpJob[0];

				var FOLocation = await tx.run(SELECT.from(v_FOLocation).where({
					externalCode: empJob.COMPANY
				}));
				//console.log("FOLocation", FOLocation)
				if (FOLocation.length > 0) {
					var work1 = partTimeCalculation(FOLocation, claimAdmin, employeeDetails[0], NoPayLeave, resEmpJob);
					var Entitlement1 = work1 * Entitlement;
					//return (Entitlement) + GV_BenefitAdjust;
					return {
						"type": "S",
						"value": (Entitlement1) + GV_BenefitAdjust,
						"message": null
					}
				} else {
					//return "Employee data not found";
					return {
						"type": "E",
						"message": "Employee data not found",
						"value": null
					}
				}
			} else {
				return {
					"type": "E",
					"message": "Employee data not found",
					"value": null
				}
			}
		}
	}

	srv.on('postRingFencing', async(req) => {
		let ringData = req.data.ringData;
		const tx = cds.transaction(req);
		let result = 0;
		try {
			result = await tx.run(INSERT.into(Medisave_Credit).entries(ringData));
			//let count = result.affectedRows;
			return result.affectedRows;
		} catch (error) {
			return req.reject({
				code: '430',
				message: error.message
			});
		}
	});

	srv.on('calculateRingFencing', async(req) => {
		let requestData = req.data;
		let finalResult = [];
		let currentYear = req.data.currentYear; //requestData.claimDate.split('-')[0];
		let sdate = [currentYear, '01', '01'].join('-');
		let edate = [currentYear, '12', '31'].join('-');
		let prorationEntitlement = 0;
		const tx = cds.transaction(req);

		let adminData = await tx.run(
			SELECT.from(Benefit_Claim_Admin).where({
				'Dependent_Claim_Code': {
					'!=': 'null'
				},
				'START_DATE': {
					'<=': sdate
				},
				'END_DATE': {
					'>=': edate
				}
			})
		);

		/*let dependentClaimCode = [];
		for (let i = 0; i < adminData.length; i++) {
			if (adminData[i].Dependent_Claim_Code) {
				dependentClaimCode.push(adminData[i]);
			}
		}*/

		if (adminData.length > 0) {
			let approvedStstus = "Approved";
			for (let i = 0; i < adminData.length; i++) {
				let medicalSQl =
					`SELECT EMPLOYEE_ID,
                            CLAIM_CODE,
                            sum(CLAIM_AMOUNT) as CLAIM_AMOUNT, 
                            sum(CONSULTATION_FEE) as YTDConsultation,
                            sum(OTHER_COST) as YTDOthers 
                            FROM "BENEFIT_MEDICAL_CLAIM"
                        where CLAIM_CODE = '${adminData[i].Dependent_Claim_Code}' AND
                            CLAIM_STATUS = '${approvedStstus}' AND
                            CLAIM_DATE BETWEEN '${sdate}' AND '${edate}'
                        GROUP BY 
                            EMPLOYEE_ID,
                            CLAIM_CODE`;

				let medicalResult = await tx.run(medicalSQl);
				//if (medicalResult.length > 0) {

				for (var j = 0; j < medicalResult.length; j++) {

					let eligibilitySQL =
						`SELECT "CLAIM_CODE",
                                MAX("SEQUENCE"),
                                "EFFECTIVE_DATE",
                                "END_DATE",
                                "ENTITLEMENT",
                                "CATEGORY_CODE",
                                "CATEGORY_DESC"
                            FROM "SF_EMPLOYEEELIGIBILITY"('${medicalResult[j].EMPLOYEE_ID}')
                            WHERE  "CLAIM_CODE" = '${medicalResult[j].CLAIM_CODE}'  AND
                                    "EFFECTIVE_DATE" >= '1900-01-01' AND
                                    "END_DATE" <= '9999-12-31'
                            GROUP BY "CLAIM_CODE",
                                    "EFFECTIVE_DATE",
                                    "END_DATE",
                                    "ENTITLEMENT",
                                    "CATEGORY_CODE",
                                    "CATEGORY_DESC"`

					let eligibilityData = await tx.run(eligibilitySQL);
					prorationEntitlement = await calculateProration(tx, medicalResult[j].EMPLOYEE_ID, currentYear, medicalResult[j].CLAIM_CODE,
						eligibilityData[0].CATEGORY_CODE, eligibilityData[0].ENTITLEMENT);
					/* if (prorationEntitlement.type === "E") {
					     return req.reject({
					         code: '435',
					         message: prorationEntitlement.message
					     });
					 } */
					if (!medicalResult[j].CLAIM_AMOUNT) {
						medicalResult[j].CLAIM_AMOUNT = 0;
					}
					requestData.taken = parseFloat(medicalResult[j].CLAIM_AMOUNT);
					requestData.balance = parseFloat(eligibilityData[0].ENTITLEMENT) - requestData.taken;
					let maxBalance = 0;
					if (requestData.balance < eligibilityData[0].ENTITLEMENT) {
						maxBalance = requestData.balance;
					} else {
						maxBalance = parseFloat(eligibilityData[0].ENTITLEMENT) / 2;
					}

					let sMonth = new Date().getMonth() + 1;
					let sDay = new Date().getDay();
					if (Number(sMonth) < 10) {
						sMonth = '0' + sMonth;
					}
					if (Number(sDay) < 10) {
						sDay = '0' + sDay;
					}
					let today = [new Date().getFullYear(), sMonth, sDay].join('-');

					let refNum = adminData[i].Dependent_Claim_Code + '-' + new Date().getTime(); //C048, '${adminData[i].Pay_Component}',

					finalResult.push({
						"employeeId": medicalResult[j].EMPLOYEE_ID,
						"Claim_Code": medicalResult[j].CLAIM_CODE,
						"entitlement": parseFloat(eligibilityData[0].ENTITLEMENT),
						"refNum": refNum,
						"Ring_Fenced_Claim_Amount": maxBalance,
						"taken": requestData.taken,
						"balance": requestData.balance,
						"prorationEntitlement": prorationEntitlement.value,
						"type": prorationEntitlement.type,
						"message": prorationEntitlement.message
					});
					/*let updateSQl =
					    `INSERT into  BENEFIT_MEDISAVE_CREDIT VALUES(
					                                                    '${refNum}',  
					                                                    '${medicalResult[j].EMPLOYEE_ID}',
					                                                    'C048',
					                                                    '${today}',  
					                                                    ${maxBalance}  
					                    )`; */
					try {
						//let updateConunt = await tx.run(updateSQl);
					} catch (error) {
						return req.reject({
							code: '430',
							message: error
						});
					}

				}
				/*return {
				    "REF_NUM": refNum,
				    "EMPLOYEE_ID": requestData.employeeId,
				    "PAY_COMPONENT": adminData[i].Pay_Component,
				    "EFFECTIVE_DATE": today,
				    "Ring_Fenced_Claim_Amount": maxBalance
				};*/
				/*} else {
					return req.reject({
						code: '422',
						message: `No record in medical claim table!`
					});
				}*/

			}
		} else {
			return req.reject({
				code: '422',
				message: `No dependent claim code found`
			});
		}

		//return data
		return finalResult;

	});
	//============================================================
	// End: RingFencing Report
	//============================================================

	srv.on('employeeSelectApproverList', async(req) => {
		var ClaimCode = req.data.Claim_code;
		var ownerId = req.data.Owner;
		var Receipt_Date = req.data.Receipt_Date;
		var behalf = req.data.behalf;
		var sp, output, approvalData = [];

		let dbConn = new dbClass(await dbClass.createConnection(db.options.credentials))
		sp = await dbConn.loadProcedurePromisified(hdbext, null, 'proc_Approver_List');
		output = await dbConn.callProcedurePromisified(sp, [ownerId, ClaimCode, Receipt_Date, behalf]);

		console.log(output);
		return output.results;
	});

	srv.before(['CREATE', 'UPDATE'], 'TC_MASTER_CLAIM', async(req) => {
		var lineItems = req.data.LINE_ITEM;
		var requestPass = {
			"data": {}
		};
		const tx = cds.transaction(req);
		for (let index in lineItems) {
			if (lineItems[index].TRANSPORT_TYPE == 'BUSMRT' && (lineItems[index].RECEIPT_NUMBER == null || lineItems[index].RECEIPT_NUMBER == '')) {

				var receiptNumber = '';
				var receiptDate = (lineItems[index].RECEIPT_DATE == null || lineItems[index].RECEIPT_DATE == '') ? '99990009' : lineItems[index].RECEIPT_DATE
					.split("-").join("");
				var startTime = (lineItems[index].START_TIME == null || lineItems[index].START_TIME == '') ? '99990009' : lineItems[index].START_TIME
					.split(":").join("");
				receiptNumber = lineItems[index].EMPLOYEE_ID + receiptDate + startTime;

				result2 = await tx.run(
					`SELECT
						"CLAIM_LINEITEM"."CLAIM_REFERENCE"
					 FROM "BENEFIT_TC_LINEITEM_CLAIM" AS "CLAIM_LINEITEM"
					 INNER JOIN "BENEFIT_TC_MASTER_CLAIM" AS "CLAIM_MASTER"
					 ON "CLAIM_LINEITEM"."PARENT_CLAIM_REFERENCE" = "CLAIM_MASTER"."CLAIM_REFERENCE"
					 WHERE "CLAIM_LINEITEM"."RECEIPT_NUMBER"='${receiptNumber}' AND
						  "CLAIM_MASTER"."CLAIM_STATUS"!='Rejected' AND
						  "CLAIM_MASTER"."CLAIM_STATUS"!='Cancelled'`
				);
				if (result2.length > 0) {
					return req.reject({
						valid: false,
						code: '422',
						message: `Duplicate receipt number`
					});

				} else {
					lineItems[index].RECEIPT_NUMBER = receiptNumber;
				}
			}
		}

	});
	srv.on('calulationTransportClaim', async(req) => {
		const Transport = req.data.lineitem;
		const tx = cds.transaction(req);
		if (Transport.CLAIM_CODE == 'TPTPB') {
			Transport.CLAIM_AMOUNT = Transport.RECEIPT_AMOUNT
		} else if (Transport.CLAIM_CODE == 'TPTML') {
			var vehicleRate = await tx.run(SELECT.from(VEHICLE_RATE).where({
				START_DATE: {
					'<=': Transport.RECEIPT_DATE
				},
				END_DATE: {
					'>=': Transport.RECEIPT_DATE
				},
				TRANSPORT_TYPE: Transport.TRANSPORT_TYPE
			}));
			if (vehicleRate.length != 0) {
				var erp_cost = isNaN(parseFloat(Transport.ERP_COST)) ? 0.00 : parseFloat(Transport.ERP_COST);
				var parking_cost = isNaN(parseFloat(Transport.PARKING_COST)) ? 0.00 : parseFloat(Transport.PARKING_COST);
				var total_dis = isNaN(parseFloat(Transport.TOTAL_DISTANCE)) ? 0.00 : parseFloat(Transport.TOTAL_DISTANCE);

				Transport.CLAIM_AMOUNT = (parseFloat(total_dis * vehicleRate[0].RATE) + erp_cost + parking_cost).toFixed(2);
			} else {
				return req.reject({
					valid: false,
					code: '422',
					message: `No vehicle rate found`
				});
			}

		}
		return Transport;
	})
	srv.on('copyLineItems', async(req) => {
		const masterClaim = JSON.parse(req.data.masterClaim);
		//set teh new Claim Reference
		masterClaim.CLAIM_REFERENCE = masterClaim["CATEGORY_CODE"] + new Date().getTime().toString();
		const cancelClaim = req.data.cancelClaim;
		const table_Name = req.data.table_Name;
		var table = getTableKeyEntries(table_Name);
		var tableLineName = table_Name.split("MASTER").join('LINEITEM');
		var tableLineitem = getTableKeyEntries(tableLineName);
		var allItems = [];
		const tx = cds.transaction(req);
		for (let index in cancelClaim) {
			var lineItems = await tx.run(SELECT.from(tableLineitem.table_Name).where({
				PARENT_CLAIM_REFERENCE: cancelClaim[index].CLAIM_REFERENCE,
				PARENT_CLAIM_DATE: cancelClaim[index].CLAIM_DATE,
				PARENT_EMPLOYEE_ID: cancelClaim[index].EMPLOYEE_ID
			}));
			if (lineItems.length != 0) {
				for (let item in lineItems) {
					lineItems[item].CLAIM_REFERENCE = lineItems[item]["CLAIM_CODE"] + item + new Date().getTime().toString();
					delete lineItems[item].PARENT_CLAIM_REFERENCE;
					delete lineItems[item].PARENT_CLAIM_DATE;
					delete lineItems[item].PARENT_EMPLOYEE_ID;
					delete lineItems[item].PARENT_CLAIM_CATEGORY;
					allItems.push(lineItems[item]);
				}
			}
		}
		masterClaim.LINE_ITEM = allItems;
		var copyCreate = await tx.run(INSERT.into(table.table_Name).entries(masterClaim));
		if (copyCreate != 0) {
			return "The new Copy Claim with Reference " + masterClaim.CLAIM_REFERENCE + " has been created";
		} else {
			return req.reject({
				valid: false,
				code: '402',
				message: `The Copy of Claim failed`
			});
		}
	});

	function _appendQueryForExcelReport(req) {
		let employeeId = req.data.USERID;
		let hrAdmin = req.data.HR_ADMIN;
		let filterStartDate = req.data.fromDate;
		let filterEndDate = req.data.toDate;
		let claimCordin = req.data.CORDIN;
		let Personnel_Area = req.data.Personnel_Area;
		let Personal_Subarea = req.data.Personal_Subarea;
		let Pay_Grade = req.data.Pay_Grade;
		let Division = req.data.Division;
		let Year = req.data.Year;
		let CLAIM_STATUS= req.data.CLAIM_STATUS;
		let CLAIM_TYPE= req.data.CLAIM_TYPE;
		let CATEGORY_CODE= req.data.CATEGORY_CODE;

		// var options = { hour12: false };
		// var current = new Date().toLocaleString('en-DE', options);
		// current = current.split(",")[0].split("/").reverse().join("-")+current.split(",")[1];

		var current = new Date().toJSON().split("T")[0];

		if (Personnel_Area != "" && Personal_Subarea != "" && hrAdmin != "") {
			var Criterias_Employee_INNER =
				`SELECT * FROM "BENEFIT_HR_ADMIN_EMPLOYEE" 
			WHERE "HR_USER" ='${hrAdmin}' AND "PERSONNEL_AREA" ='${Personnel_Area}' AND "PERSONAL_SUBAREA"='${Personal_Subarea}'`;
			if (Pay_Grade != "") {
				Criterias_Employee_INNER = Criterias_Employee_INNER + `and "PAY_GRADE" = '${Pay_Grade}' `;
			}
			if (Division != "") {
				Criterias_Employee_INNER = Criterias_Employee_INNER + `and "DIVISION" = '${Division}' `
			}

			var Criterias_Employee =
				` INNER JOIN (SELECT DISTINCT WITHINCLUDE."USERID"
			FROM (SELECT * FROM (${Criterias_Employee_INNER}) as HRADMIN  
			LEFT JOIN "BENEFIT_INC_HRA_EMP" as INCLUDE
			ON INCLUDE."ADMIN_HR_USER" = HRADMIN."HR_USER"
			AND INCLUDE."ADMIN_SEQUENCE" = HRADMIN."SEQUENCE") as WITHINCLUDE
			LEFT OUTER JOIN "BENEFIT_EXC_HRA_EMP" as EXCLUDE
			ON EXCLUDE."ADMIN_HR_USER" = WITHINCLUDE."HR_USER"
			AND EXCLUDE."ADMIN_SEQUENCE" = WITHINCLUDE."SEQUENCE"
			AND WITHINCLUDE."USERID" = EXCLUDE."USERID") as HR_EMP
			ON hist."CLAIM_OWNER_ID"= HR_EMP."USERID" `
		} else {
			var Criterias_Employee = ``;
		}

		// if (Personnel_Area != "" && Personal_Subarea != "") {
		// 	var Criterias_Employee =
		// 		` INNER JOIN "SF_EMPJOB" as empjob 
		// 	on  empjob."USERID" = APP."EMPLOYEE_ID"
		// 	and empjob."STARTDATE" <= TO_SECONDDATE (CONCAT('${current}', ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') 
		// 	and empjob."ENDDATE" >= TO_SECONDDATE (CONCAT('${current}', ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') 
		// 	and empjob."COMPANY" = '${Personnel_Area}' and empjob."LOCATION" = '${Personal_Subarea}' `;
		// 	if (Pay_Grade != "") {
		// 		Criterias_Employee = Criterias_Employee + `and empjob."PAYGRADE" = '${Pay_Grade}' `;
		// 	}
		// 	if (Division != "") {
		// 		Criterias_Employee = Criterias_Employee + `and empjob."DIVISION" = '${Division}' `
		// 	}
		// } else {
		// 	var Criterias_Employee = ``;
		// }

		if (claimCordin != "") {
			var CLAIMJOIN =
				` INNER JOIN BENEFIT_CLAIM_COORD_EMPLOYEE(claim_Cordinator => '${claimCordin}') as coordinate
						  ON hist."CLAIM_OWNER_ID" = coordinate.EMPLOYEEID `;
		} else {
			var CLAIMJOIN = ' ';
		}

		if (employeeId == "" && filterStartDate == "" && filterEndDate == "") {
			var sWHERE = ``;
		} else if (employeeId != "" && filterStartDate == "" && filterEndDate == "") {

			if (Array.isArray(JSON.parse(employeeId))) {
				var removeArray = employeeId.replace("[", "(").replace("]", ")").replace(/"/g, "'")
				var sWHERE = `WHERE hist."CLAIM_OWNER_ID" IN ${removeArray}`;
			} else {
				var sWHERE = `WHERE hist."CLAIM_OWNER_ID" = '${employeeId}'`;
			}

		} else if (employeeId == "" && filterStartDate != "" && filterEndDate != "") {
			var sWHERE = `WHERE "CLAIM_DATE" >= '${filterStartDate}' AND 
						  "CLAIM_DATE" <= '${filterEndDate}'`;
		} else {

			if (Array.isArray(JSON.parse(employeeId))) {
				var removeArray = employeeId.replace("[", "(").replace("]", ")").replace(/"/g, "'")
				var sWHERE =
					`WHERE hist."CLAIM_OWNER_ID" IN ${removeArray} AND "CLAIM_DATE" >= '${filterStartDate}' AND 
						  "CLAIM_DATE" <= '${filterEndDate}'`;
			} else {
				var sWHERE =
					`WHERE hist."CLAIM_OWNER_ID" = '${employeeId}' AND "CLAIM_DATE" >= '${filterStartDate}' AND 
						  "CLAIM_DATE" <= '${filterEndDate}'`;

			}
		}
			var otherFilter = [];
				if (CATEGORY_CODE != ""){
					otherFilter.push(`CATEGORY_CODE = '${CATEGORY_CODE}'`)
				}
				if(CLAIM_STATUS != ""){
					otherFilter.push(`CLAIM_STATUS = '${CLAIM_STATUS}'`)
				}
				if(CLAIM_TYPE!= ""){
					otherFilter.push(`CLAIM_TYPE = '${CLAIM_TYPE}'`)
				}
				if(Personnel_Area!= ""){
					otherFilter.push(`COMPANY = '${Personnel_Area}'`)
				}
				for (index in otherFilter){
					if(index == 0){
						if(sWHERE == ``){
							sWHERE += `WHERE `+otherFilter[index];	
						}
						else{
							sWHERE += ` AND `+otherFilter[index];
						}
						
					}
					else{
						sWHERE += ` AND `+otherFilter[index];
					}
					
				}
				

		var sAPPENDQUERY = Criterias_Employee + CLAIMJOIN + sWHERE;
		console.log(sAPPENDQUERY);
		// var sAPPENDQUERY = CLAIMJOIN + sWHERE;
		return sAPPENDQUERY;
	};
	srv.on('ApprovalHistory', async(req) => {
		const tx = cds.transaction(req);
		const CLAIM_OWNER_ID = req.data.CLAIM_OWNER_ID;
		const EMPLOYEE_ID = req.data.EMPLOYEE_ID;
		const CLAIM_STATUS = req.data.CLAIM_STATUS;

		//------Set filter for report
		var sAPPENDQUERY = _appendQueryForExcelReport(req);
		// var filterAdd = ``;
		// if (CLAIM_OWNER_ID != undefined && CLAIM_OWNER_ID != null && CLAIM_OWNER_ID != '') {
		// 	filterAdd = `WHERE CLAIM_OWNER_ID = '${CLAIM_OWNER_ID}'`;
		// }

		// if (EMPLOYEE_ID != undefined && EMPLOYEE_ID != null && EMPLOYEE_ID != '') {
		// 	if (filterAdd == ``) {
		// 		filterAdd = `WHERE EMPLOYEE_ID = '${EMPLOYEE_ID}'`;
		// 	} else {
		// 		filterAdd = filterAdd + ` and EMPLOYEE_ID = '${EMPLOYEE_ID}'`;
		// 	}

		// }

		// if (CLAIM_STATUS != undefined && CLAIM_STATUS != null && CLAIM_STATUS != '') {
		// 	if (filterAdd == ``) {
		// 		filterAdd =
		// 			`WHERE CLAIM_STATUS != 'Approved' and CLAIM_STATUS !=  'Cancellation Approved' and CLAIM_STATUS !=  'Rejected' and CLAIM_STATUS !=  'Cancelled'`;
		// 	} else {
		// 		filterAdd = filterAdd +
		// 			` and CLAIM_STATUS != 'Approved' and CLAIM_STATUS !=  'Cancellation Approved' and CLAIM_STATUS !=  'Rejected' and CLAIM_STATUS !=  'Cancelled'`;
		// 	}

		// }

		var sqlApproval =
			`SELECT 
					 hist."CLAIM_REF_NUMBER",
				     hist."CLAIM_REFERENCE",
			    	 hist."EMPLOYEE_ID",
			    	 hist."EMPLOYEE_NAME",
			    	 hist."CLAIM_TYPE",
			    	 hist."CLAIM_DATE",
			    	 hist."AMOUNT",
			    	 hist."CLAIM_STATUS",
			    	 hist."CATEGORY_CODE",
			    	 hist."CLAIM_OWNER_ID",
			    	 hist."CLAIM_CATEGORY",
			    	 hist."SUBMITTED_BY",
			    	 hist."ESTIMATEPAYMENTDATE",
			    	 hist."RECEIPT_DATE",
			    	 hist."CLAIM_OWNER_FIRSTNAME",
			    	 hist."CLAIM_OWNER_LASTNAME",
			    	 hist."CLAIM_OWNER_FULLNAME",
			    	 hist."REP_STATUS",
			    	 hist."POSTINGCUTOFFDATE",
			    	 cstatus.DELEGATION1,
    				 cstatus.DELEGATION2,
    				 cstatus.DELEGATION3,
    				 cstatus.RESPONSE_DATE,
			    	 cancel."CANCELAFTERAPPROVE"
							FROM "BENEFIT_APPROVAL_HISTROY" hist
							INNER JOIN 
					(SELECT DISTINCT
							CS."CLAIM_REFERENCE",
							CASE WHEN  master."CLAIM_REFERENCE" IS NULL THEN '' 
							ELSE 'X' END as "CANCELAFTERAPPROVE"
					FROM "BENEFIT_CLAIM_STATUS" CS 
				LEFT JOIN "BENEFIT_CLAIM_CANCEL_MASTER" master 
				ON CS."CLAIM_REFERENCE" = master."PARENT_CLAIM_REFERENCE" ) cancel
				ON cancel."CLAIM_REFERENCE" = hist."CLAIM_REFERENCE"
				inner join "BENEFIT_CLAIM_STATUS" as cstatus
				on cstatus.Claim_Reference = hist.CLAIM_REFERENCE` +
			sAPPENDQUERY;
		// filterAdd;

		var result = await tx.run(sqlApproval);
		// console.log(result)
		return result;
	});
	srv.on('admin_role_create' , async(req)=>{
		var admin_list= req.data.ADMIN_ROLE;
		const tx = cds.transaction(req);
		var adminout = await tx.run(INSERT.into(ADMIN_ROLE).entries(admin_list));
		if(adminout != 0) {
			return "ADMIN_ROLE Table entries creation successful"
		}
		else{
			return req.error(407,"ADMIN_ROLE table entries creation failed")
		}
	});
	
	srv.before('READ', 'Co_Payment', async(req) => {
		let results = {};
		results.user = req.user.id;
		if (req.user.hasOwnProperty('locale')) {
			results.locale = req.user.locale;
		}
		results.scopes = {};
		results.scopes.identified = req.user.is('identified-user');
		results.scopes.authenticated = req.user.is('authenticated-user');
		// results.scopes.Viewer = req.user.is('Viewer');
		// results.scopes.Admin = req.user.is('Admin');
		results.scopes.zadmin = req.user.is('zadmin');
		results.scopes.employeeval = req.user.is('employeeval');
		results.scopes.Benefit_Employee_At = req.user.is('Benefit_Employee_At');

		results.attrs = {};
		if (req.user.hasOwnProperty('attr')) {
			results.attrs.Region = req.user.attr.Region;
		}
		console.log(JSON.stringify(results) + JSON.stringify(req.user));
	});

	srv.on('YTDReport', async(req, res) => {
		try {
			let USERID = req.data.USERID;
			let CURRENT_DATE = req.data.CURRENT_DATE;
			let COMPANY = req.data.COMPANY;
			const tx = cds.transaction(req);
			var finalValues = [];

			//===================================
			// let currentYear = data.claimDate.split("-")[0];
			// let first_date = [currentYear, '01', '01'].join('-');
			// let last_date = [currentYear, 12, 31].join('-');

			let currentYear = CURRENT_DATE.split("-")[0];
			let first_date = [currentYear, '01', '01'].join('-');
			let last_date = [currentYear, 12, 31].join('-');

			let claimcodeList =
				`SELECT 
											CASE 
											WHEN  "CATEGORY_CODE" <> 'WRC'
									AND "CATEGORY_CODE" <> 'WRC_HR' AND "CATEGORY_CODE" <>'TC'
                                    -- Since SP is exception it has Lineitem and Entitlement and has only one Cliam code for each of the Master
									-- AND "CATEGORY_CODE" <>'SP' AND "CATEGORY_CODE" <>'SP1' AND "CATEGORY_CODE" <>'SP2'
                                    -- AND "CATEGORY_CODE" <>'SP3' 
                                    AND "CATEGORY_CODE" <> 'COV' AND "CATEGORY_CODE" <> 'SDFC' 
                                    AND "CATEGORY_CODE" <> 'SDFR' AND "CATEGORY_CODE" <> 'CPC'
                                    AND "CATEGORY_CODE" <> 'OC' AND "CATEGORY_CODE" <> 'PAY_UP'
									THEN "CLAIM_CODE"
									ELSE "CATEGORY_CODE"
									END as "CLAIM_CODE",
											"CATEGORY_CODE",
											"DESCRIPTION"
								from
									(SELECT * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY in ('MOHH','MOHHSCH') AND "CATEGORY_CODE" != 'WRC'
									AND "CATEGORY_CODE" != 'WRC_HR' AND "CATEGORY_CODE" != 'TC'
									AND "CATEGORY_CODE" != 'SP' AND "CATEGORY_CODE" != 'SP1' AND "CATEGORY_CODE" != 'SP2'
                                    AND "CATEGORY_CODE" != 'SP3' AND "CATEGORY_CODE" != 'COV'
                                    AND "CATEGORY_CODE" != 'SDFC' AND "CATEGORY_CODE" != 'SDFR'
                                    AND "CATEGORY_CODE" != 'CPC' AND "CATEGORY_CODE" != 'OC' AND "CATEGORY_CODE" != 'PAY_UP'
									UNION
									SELECT TOP 1 * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY ='MOHH' AND "CATEGORY_CODE" = 'WRC'
									UNION
									SELECT TOP 1 * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY ='MOHH' AND "CATEGORY_CODE" = 'WRC_HR'
									UNION
									SELECT TOP 1 * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY ='MOHH' AND "CATEGORY_CODE" = 'TC'
									UNION
									SELECT TOP 1 * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY ='MOHH' AND "CATEGORY_CODE" = 'SP'
									UNION 
                                    SELECT TOP 1 * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY ='MOHH' AND "CATEGORY_CODE" = 'SP1'
									UNION 
                                    SELECT TOP 1 * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY ='MOHH' AND "CATEGORY_CODE" = 'SP2'
									UNION 
                                    SELECT TOP 1 * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY ='MOHH' AND "CATEGORY_CODE" = 'SP3'
									UNION 
									SELECT TOP 1 * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY ='MOHH' AND "CATEGORY_CODE" = 'COV'
									UNION 
									SELECT TOP 1 * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY ='MOHHSCH' AND "CATEGORY_CODE" = 'SDFC'
									UNION 
									SELECT TOP 1 * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY ='MOHHSCH' AND "CATEGORY_CODE" = 'SDFR'
									UNION 
									SELECT TOP 1 * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY ='MOHHSCH' AND "CATEGORY_CODE" = 'CPC'
									UNION 
									SELECT TOP 1 * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY ='MOHHSCH' AND "CATEGORY_CODE" = 'OC'
									UNION 
									SELECT TOP 1 * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
									WHERE COMPANY ='MOHHSCH' AND "CATEGORY_CODE" = 'PAY_UP'
									)`;
			let claimcodeListValues = await tx.run(claimcodeList);

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
					let prorationResult = await prorationRule(prorationPayload, req, false);
					data.entitlement = parseInt(prorationResult.value);
					// data.remainingWardDays = data.totalWardDays - data.consumedWardDays - data.pendingWardDays;
				} else {
					data.totalWardDays = 0;
					data.remainingWardDays = 0;
				}

				let approvedMedicalClaimQuery =
					`
				SELECT * FROM "GET_DRAFT_CDS"('${USERID}')
	            WHERE "CLAIM_STATUS"='Approved' AND `;

				let pendingMedicalClaimQuery =
					`
				SELECT * FROM "GET_DRAFT_CDS"('${USERID}')
	            WHERE "CLAIM_STATUS" LIKE 'Pending for approval%' AND `;

				let querySubString = '';
				if (claimcodeListValues[index].CLAIM_CODE === 'OPTS') {
					querySubString = `"CLAIM_CODE" IN ('OPTS', 'OPTD') AND "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'`;
				} else if (claimcodeListValues[index].CLAIM_CODE === "OPTD") {
					querySubString = `"CLAIM_CODE" IN ('OPTD') AND "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'`;
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
					approvedClaims[i].CLAIM_CONSULTATION_FEE = (approvedClaims[i].CONSULTATION_FEE) ? parseFloat(approvedClaims[i].CONSULTATION_FEE) :
						0;
					approvedClaims[i].CLAIM_OTHER_COST = (approvedClaims[i].OTHER_COST) ? parseFloat(approvedClaims[i].OTHER_COST) : 0;
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
                        FROM "GET_DRAFT_CDS"('${USERID}')
                    WHERE "EMPLOYEE_ID"='${data.employeeId}' AND
                        "CLAIM_CODE" IN ('OPTS')  AND
                        "CLAIM_STATUS"='Approved' AND
                        "CLAIM_DATE" BETWEEN '${first_date}' AND '${last_date}'
                    GROUP BY 
                        "EMPLOYEE_ID"`
					);

					let OPTSPending = await tx.run(
						`SELECT EMPLOYEE_ID,
                        sum(CLAIM_AMOUNT) as PENDING_AMOUNT
                        FROM "GET_DRAFT_CDS"('${USERID}')
                    WHERE "EMPLOYEE_ID"='${data.employeeId}' AND
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
				if (entitlementFindList.length > 0 && data.Claim_Code == 'HOSPS_DAY') {
					let prorationPayload = {
						UserID: data.employeeId,
						Entitlement: entitlementFindList[0].ENTITLEMENT,
						EmpType: "",
						WorkingPeriod: "",
						ClaimDetail: {
							Date: new Date(data.claimDate),
							Company: data.company,
							Claim_Code: data.Claim_Code,
							Claim_Category: entitlementFindList[0].CATEGORY_CODE
						}
					};
					let prorationResult = await prorationRule(prorationPayload, req, false);
					data.totalWardDays = parseInt(prorationResult.value);
					data.remainingWardDays = data.totalWardDays - data.consumedWardDays - data.pendingWardDays;
				} else {
					data.totalWardDays = 0;
					data.remainingWardDays = 0;
				}

				finalValues.push(data);
			}
			return finalValues;
		} catch (err) {
			req.error(422, err.message);
		}
	});

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
	srv.on('YTDReportSpawn', async(req, res) => {
		var userid = reportEmployeeExtract(req).length != 0 ? JSON.stringify(reportEmployeeExtract(req)) : '';
		var PERSONAL_AREA_IN = req.data.PERSONAL_AREA_IN;
		var PERSONAL_SUB_AREA = req.data.PERSONAL_SUB_AREA;
		var PAY_GRADE = req.data.PAY_GRADE;
		var DIVISION = req.data.DIVISION;
		var CLAIM_YEAR = req.data.CLAIM_YEAR;

		const tx = cds.transaction(req);
		let searchJobDataBefore = await tx.run(SELECT.from(THREAD_JOB_INFO).where({
			id: 1,
			process: "PRORATE_CLAIMS",
			YEAR: CLAIM_YEAR,
			PAY_GRADE: PAY_GRADE,
			PERSONAL_AREA: PERSONAL_AREA_IN,
			PERSONAL_SUB_AREA: PERSONAL_SUB_AREA,
			DIVISION: DIVISION

		}));
		if (searchJobDataBefore.length > 0) {
			// Update the status Before Data
			let updateJobDataBefore = await tx.run(UPDATE(THREAD_JOB_INFO).set({
				job_status: "X"
			}).where({
				id: 1,
				process: "PRORATE_CLAIMS",
				YEAR: CLAIM_YEAR,
				PAY_GRADE: PAY_GRADE,
				PERSONAL_AREA: PERSONAL_AREA_IN,
				PERSONAL_SUB_AREA: PERSONAL_SUB_AREA,
				DIVISION: DIVISION
			}));
		} else {
			let insertJobDataBefore = await tx.run(INSERT.into(THREAD_JOB_INFO).entries({
				id: 1,
				process: "PRORATE_CLAIMS",
				YEAR: CLAIM_YEAR,
				PAY_GRADE: PAY_GRADE,
				PERSONAL_AREA: PERSONAL_AREA_IN,
				PERSONAL_SUB_AREA: PERSONAL_SUB_AREA,
				DIVISION: DIVISION,
				job_status: "X"
			}));
		}
		let job = cds.spawn({
			after: 100
		}, async(tx) => {
			var medical = await medicalClaimYTDReport_Spawn(tx, req)
			let updateJobDataAfter = await tx.run(UPDATE(THREAD_JOB_INFO).set({
				job_end_time: sqlDateTimeFormat(),
				job_status: "Y"
			}).where({
				id: 1,
				process: "PRORATE_CLAIMS",
				YEAR: CLAIM_YEAR,
				PAY_GRADE: PAY_GRADE,
				PERSONAL_AREA: PERSONAL_AREA_IN,
				PERSONAL_SUB_AREA: PERSONAL_SUB_AREA,
				DIVISION: DIVISION
			}))
			console.log(medical);
			// return medical;
		})

		var returnValue = await job.on('succeeded', (data) => {
			console.log('The YTD report is generated');
			// return data;
		})

		//New Way End
		return "The YTD report generation is in progress at the Background";
	});
	srv.on('YTDReportWithAll', async(req, res) => {
		// var userid = req.data.USER_ID;
		var userid = reportEmployeeExtract(req).length != 0 ? JSON.stringify(reportEmployeeExtract(req)) : '';
		var PERSONAL_AREA_IN = req.data.PERSONAL_AREA_IN;
		var PERSONAL_SUB_AREA = req.data.PERSONAL_SUB_AREA;
		var PAY_GRADE = req.data.PAY_GRADE;
		var DIVISION = req.data.DIVISION;
		var CLAIM_YEAR = req.data.CLAIM_YEAR;
		// const dynamicPool = new DynamicPool(4);
		//Create a static worker pool with 8 workers
		// const pool = new StaticPool({
		// 	size: 8,
		// 	task: "./util/YTDreportProration.js"
		// });

		const tx = cds.transaction(req);
		var vCalculation =
			`SELECT * FROM
			(SELECT 
				"EMPLOYEE", 
		    	"CLAIM_CODE_VALUE",
				"YEAR",
				"DESCRIPTION",
				"YTD_OTHER",
		    	"YTD_CONSULT",
		    	"YTD_WARD_CHARGE",
		    	"YTD_HOSPITAL_FEE",
		    	"PENDING_AMOUNT",
		    	"TAKEN_AMOUNT",
		    	"BALANCE",
		    	"ENTITLEMENT",
		    	"PAY_GRADE",
				"PERSONAL_AREA",
				"PERSONAL_SUB_AREA",
				"DEPARMENT",
				"DIVISION"
				   FROM "CALCULATION_GET_TAKEN_PENDING_ALL"
	(placeholder."$$USER_ID$$"=>'',placeholder."$$CLAIM_YEAR$$"=>'${CLAIM_YEAR}')
	WHERE PERSONAL_AREA = '${PERSONAL_AREA_IN}' and PERSONAL_SUB_AREA ='${PERSONAL_SUB_AREA}' and PAY_GRADE='${PAY_GRADE}' and DIVISION='${DIVISION}' 
	AND (CLAIM_CODE_VALUE != 'DEN' AND CLAIM_CODE_VALUE != 'DEN_EFMR' AND CLAIM_CODE_VALUE != 'HOSPD'
	AND CLAIM_CODE_VALUE != 'HOSPS' AND CLAIM_CODE_VALUE != 'HOSPS_EFMR' AND CLAIM_CODE_VALUE != 'OPTD'
	AND CLAIM_CODE_VALUE !='OPTS' AND CLAIM_CODE_VALUE !='OPTS_EFMR' AND CLAIM_CODE_VALUE !='SPTD' 
	AND CLAIM_CODE_VALUE !='SPTS' AND CLAIM_CODE_VALUE !='HOSPD_DAY' AND CLAIM_CODE_VALUE !='HOSPS_DAY' 
	AND CLAIM_CODE_VALUE !='PTF' AND CLAIM_CODE_VALUE !='TrvIntExamSpons' AND CLAIM_CODE_VALUE !='TrvHMDSpons2' AND CLAIM_CODE_VALUE !='TrvHMDSpons1' 
	AND CLAIM_CODE_VALUE !='TrvExitExamSpons') 
	UNION 
	SELECT 
		"EMPLOYEE", 
    	"CLAIM_CODE_VALUE",
		"YEAR",
		"DESCRIPTION",
		"YTD_OTHER",
    	"YTD_CONSULT",
    	"YTD_WARD_CHARGE",
    	"YTD_HOSPITAL_FEE",
    	"PENDING_AMOUNT",
    	"TAKEN_AMOUNT",
    	"BALANCE",
    	"ENTITLEMENT",
    	"PAY_GRADE",
		"PERSONAL_AREA",
		"PERSONAL_SUB_AREA",
		"DEPARMENT",
		"DIVISION"
		 FROM "CALCULATION_PRORATED_CLAIMS_YTD" WHERE PERSONAL_AREA = '${PERSONAL_AREA_IN}' 
		 and PERSONAL_SUB_AREA ='${PERSONAL_SUB_AREA}' and PAY_GRADE='${PAY_GRADE}' and DIVISION='${DIVISION}' and YEAR ='${CLAIM_YEAR}') `

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
		//Old Way
		var oEmployeeData = await tx.run(vCalculation);
		// var medical = await medicalClaimYTDReport(tx, req)
		// oEmployeeData = oEmployeeData.concat(medical);

		//New Way
		// var oEmployeeData = await dynamicPool
		// 	.exec({
		// 		task: "./srv/util/YTDreportother.js",
		// 		param: {
		// 			req: req,
		// 			tx:tx
		// 		}
		// 	})
		// 	.then((result) => {
		// 		console.log(result.otherReport); // result will be 2.
		// 		return result.otherReport;
		// 	});
		// var medical = await dynamicPool
		// 	.exec({
		// 		task: "./srv/util/YTDreportProration.js",
		// 		param: {
		// 			req: req,
		// 			tx:tx
		// 		}
		// 	})
		// 	.then((result) => {
		// 		console.log(result.medicalYTDreport); // result will be 2.
		// 		return result.medicalYTDreport;
		// 	});

		// const tenant = cds.context.tenant;
		// const user = req.headers['x-user-id']
		// console.log(tenant + " "+ user)
		// var data = req.data;

		// var oEmployeeData = await pool.exec({
		// 	req: {data:data},
		// 	// tx: tx,
		// 	action:"Other"
		// }).then(result => {
		// 	// console.log(result.value);
		// 	return result.value;
		// });
		// var medical = await pool.exec({
		// 	req: {data:data},
		// 	// tx: tx,
		// 	action:"Prorate"
		// }).then(result => {
		// 	// console.log(`${result.num}th Fibonacci Number: ${result.fib}`);
		// 	return result.value;
		// });
		// oEmployeeData = oEmployeeData.concat(medical);

		// var oEmployeeData = await pool.exec({ num: 40 }).then(result => {
		//              console.log(`${result.num}th Fibonacci Number: ${result.fib}`);
		//              return `${result.num}th Fibonacci Number: ${result.fib}`;
		//          })

		// let job = cds.spawn({
		// 	after: 100
		// }, async(tx) => {
		// 	var medical = await medicalClaimYTDReport(tx, req)
		// 	return medical;
		// })

		// var returnValue = await job.on('succeeded', (data) => {
		// 	console.log('succeeded' + JSON.stringify(data))
		// 	return data;
		// })

		//New Way End
		return oEmployeeData;
	});
	srv.on('YTDReportWithCPIAll', async(req, res) => {
		var userid = req.data.USER_ID;
		// var userid = reportEmployeeExtract(req).length != 0 ? JSON.stringify(reportEmployeeExtract(req)) : '';
		var PERSONAL_AREA_IN = req.data.PERSONAL_AREA_IN;
		var PERSONAL_SUB_AREA = req.data.PERSONAL_SUB_AREA;
		var PAY_GRADE = req.data.PAY_GRADE;
		var DIVISION = req.data.DIVISION;
		var CLAIM_YEAR = req.data.CLAIM_YEAR;
		// const dynamicPool = new DynamicPool(4);
		//Create a static worker pool with 8 workers
		// const pool = new StaticPool({
		// 	size: 8,
		// 	task: "./util/YTDreportProration.js"
		// });

		const tx = cds.transaction(req);
		// (placeholder."$$USER_ID$$"=>'',placeholder."$$CLAIM_YEAR$$"=>'${CLAIM_YEAR}')
		var vCalculation =
			`SELECT 
			PENDING.* , 
			JOB."PAYGRADE" AS PAY_GRADE,
			JOB."COMPANY" AS PERSONAL_AREA,
			JOB."LOCATION" as PERSONAL_SUB_AREA,
			JOB."DEPARTMENT" AS DEPARMENT,
			JOB."DIVISION"				
			FROM "CALCULATION_GET_TAKEN_PENDING"
	(placeholder."$$USER_ID$$"=>'${userid}',placeholder."$$CLAIM_YEAR$$"=>'${CLAIM_YEAR}') PENDING
	inner join "SF_EMPJOB" JOB
	ON JOB."USERID" = PENDING."EMPLOYEE"
	WHERE  (CLAIM_CODE_VALUE != 'DEN' AND CLAIM_CODE_VALUE != 'DEN_EFMR' AND CLAIM_CODE_VALUE != 'HOSPD'
	AND CLAIM_CODE_VALUE != 'HOSPS' AND CLAIM_CODE_VALUE != 'HOSPS_EFMR' AND CLAIM_CODE_VALUE != 'OPTD'
	AND CLAIM_CODE_VALUE !='OPTS' AND CLAIM_CODE_VALUE !='OPTS_EFMR' AND CLAIM_CODE_VALUE !='SPTD' 
	AND CLAIM_CODE_VALUE !='SPTS' AND CLAIM_CODE_VALUE !='HOSPD_DAY' AND CLAIM_CODE_VALUE !='HOSPS_DAY' 
	AND CLAIM_CODE_VALUE !='PTF' AND CLAIM_CODE_VALUE !='TrvIntExamSpons' AND CLAIM_CODE_VALUE !='TrvHMDSpons2' AND CLAIM_CODE_VALUE !='TrvHMDSpons1' 
	AND CLAIM_CODE_VALUE !='TrvExitExamSpons' AND CLAIM_CODE_VALUE !='VCMMR' AND CLAIM_CODE_VALUE !='VCTDAP' ) `

		if (userid != "" && userid != null && userid != undefined) {
			// if (Array.isArray(JSON.parse(userid))) {
			// 	var removeArray = userid.replace("[", "(").replace("]", ")").replace(/"/g, "'")
			// 	var filteradd =
			// 		`and "EMPLOYEE" IN ${removeArray}`;
			// } else {
			var filteradd =
				`and EMPLOYEE='${userid}' and JOB.STARTDATE <= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') and JOB.ENDDATE >= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS')`
				// }
		} else {
			var filteradd = ``
		}

		vCalculation = vCalculation + filteradd;
		//Old Way
		var oEmployeeData = await tx.run(vCalculation);
		var medical = await medicalClaimCPIYTDReport(tx, req);
		oEmployeeData = oEmployeeData.concat(medical);
		await tx.commit();
		await tx.begin();
		let dbConn = new dbClass(await dbClass.createConnection(db.options.credentials))

		sp = await dbConn.loadProcedurePromisified(hdbext, null, 'upsertCPIytd')
		output = await dbConn.callProcedurePromisified(sp, oEmployeeData);

		//New Way
		// var oEmployeeData = await dynamicPool
		// 	.exec({
		// 		task: "./srv/util/YTDreportother.js",
		// 		param: {
		// 			req: req,
		// 			tx:tx
		// 		}
		// 	})
		// 	.then((result) => {
		// 		console.log(result.otherReport); // result will be 2.
		// 		return result.otherReport;
		// 	});
		// var medical = await dynamicPool
		// 	.exec({
		// 		task: "./srv/util/YTDreportProration.js",
		// 		param: {
		// 			req: req,
		// 			tx:tx
		// 		}
		// 	})
		// 	.then((result) => {
		// 		console.log(result.medicalYTDreport); // result will be 2.
		// 		return result.medicalYTDreport;
		// 	});

		// const tenant = cds.context.tenant;
		// const user = req.headers['x-user-id']
		// console.log(tenant + " "+ user)
		// var data = req.data;

		// var oEmployeeData = await pool.exec({
		// 	req: {data:data},
		// 	// tx: tx,
		// 	action:"Other"
		// }).then(result => {
		// 	// console.log(result.value);
		// 	return result.value;
		// });
		// var medical = await pool.exec({
		// 	req: {data:data},
		// 	// tx: tx,
		// 	action:"Prorate"
		// }).then(result => {
		// 	// console.log(`${result.num}th Fibonacci Number: ${result.fib}`);
		// 	return result.value;
		// });
		// oEmployeeData = oEmployeeData.concat(medical);

		// var oEmployeeData = await pool.exec({ num: 40 }).then(result => {
		//              console.log(`${result.num}th Fibonacci Number: ${result.fib}`);
		//              return `${result.num}th Fibonacci Number: ${result.fib}`;
		//          })

		// let job = cds.spawn({
		// 	after: 100
		// }, async(tx) => {
		// 	var medical = await medicalClaimYTDReport(tx, req)
		// 	return medical;
		// })

		// var returnValue = await job.on('succeeded', (data) => {
		// 	console.log('succeeded' + JSON.stringify(data))
		// 	return data;
		// })

		//New Way End
		// return oEmployeeData;
		return "Successly UPSERTED the values"
	});
	// async function medicalClaimYTDReport(tx, req) {
	// 	var userid = req.data.USER_ID;
	// 	// var userid = reportEmployeeExtract(req).length != 0 ? JSON.stringify(reportEmployeeExtract(req)) : '';
	// 	var PERSONAL_AREA_IN = req.data.PERSONAL_AREA_IN;
	// 	var PERSONAL_SUB_AREA = req.data.PERSONAL_SUB_AREA;
	// 	var PAY_GRADE = req.data.PAY_GRADE;
	// 	var DIVISION = req.data.DIVISION;
	// 	var CLAIM_YEAR = req.data.CLAIM_YEAR;

	// 	var CURRENT_DATE = '01-01-' + CLAIM_YEAR;
	// 	var COMPANY = req.data.PERSONAL_AREA_IN;

	// 	let currentYear = CLAIM_YEAR;
	// 	let first_date = [currentYear, '01', '01'].join('-');
	// 	let last_date = [currentYear, 12, 31].join('-');

	// 	const pool = new StaticPool({
	// 		size: 8,
	// 		task: "./util/YTDreportProration.js"
	// 	});

	// 	var finalValues = [];
	// 	var medicalClaim =
	// 		`SELECT * FROM "BENEFIT_COMPANY_CLAIM_CATEGORY" 
	// 								WHERE COMPANY ='MOHH' AND ("CATEGORY_CODE" = 'MC' OR  "CLAIM_CODE" = 'PTF' or "CATEGORY_CODE" = 'SP' OR
	// 								"CATEGORY_CODE" = 'SP1' OR "CATEGORY_CODE" = 'SP2' OR "CATEGORY_CODE" = 'SP3')`
	// 	var claimcodeListValues = await tx.run(medicalClaim);
	// 	var employeeList =
	// 		`SELECT * FROM "SF_EMPLOYEEINFORMATIONALL" 
	// 								WHERE PERSONAL_AREA = '${PERSONAL_AREA_IN}' and PERSONAL_SUB_AREA ='${PERSONAL_SUB_AREA}' 
	// 								and PAYGRADE='${PAY_GRADE}' and DIVISION='${DIVISION}'`

	// 	if (userid != "" && userid != null && userid != undefined) {
	// 		if (Array.isArray(JSON.parse(userid))) {
	// 			var removeArray = userid.replace("[", "(").replace("]", ")").replace(/"/g, "'")
	// 			var filteradd =
	// 				`and "PERSONIDEXTERNAL" IN ${removeArray}`;
	// 		} else {
	// 			var filteradd = `and PERSONIDEXTERNAL='${userid}'`
	// 		}
	// 	} else {
	// 		var filteradd = ``
	// 	}
	// 	employeeList = employeeList + filteradd;
	// 	var employeevalues = await tx.run(employeeList);
	// 	// let claimcodeListValues = await tx.run(claimcodeList);
	// 	for (var empid = 0; empid < employeevalues.length; empid++) {
	// 		var USERID = employeevalues[empid].PERSONIDEXTERNAL;
	// 		var data = pool.exec({
	// 			req: {
	// 				data: req.data
	// 			},
	// 			employeevaluesid: employeevalues[empid],
	// 			finalValues: finalValues,
	// 			claimcodeListValues:claimcodeListValues,
	// 			// tx: tx,
	// 			action: "Other"
	// 		}).then(result => {
	// 			// console.log(result.value);
	// 			return result.value;
	// 		});
	// 		finalValues.concat(data);
	// 	}
	// 	return finalValues;
	// };
	async function medicalClaimCPIYTDReport(tx, req) {
		var USERID = req.data.USER_ID;
		// var userid = reportEmployeeExtract(req).length != 0 ? JSON.stringify(reportEmployeeExtract(req)) : '';
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
									"CATEGORY_CODE" = 'SP1' OR "CATEGORY_CODE" = 'SP2' OR "CATEGORY_CODE" = 'SP3')`
		var claimcodeListValues = await tx.run(medicalClaim);
		// var employeeList =
		// 	`SELECT * FROM "SF_EMPLOYEEINFORMATIONALL" 
		// 							WHERE PERSONAL_AREA = '${PERSONAL_AREA_IN}' and PERSONAL_SUB_AREA ='${PERSONAL_SUB_AREA}' 
		// 							and PAYGRADE='${PAY_GRADE}' and DIVISION='${DIVISION}'`

		// var employeeList = `SELECT * FROM "SF_EMPLOYEEELIGIBILITY"(EmpID=>'${userid}')`

		// if (userid != "" && userid != null && userid != undefined) {
		// 	if (Array.isArray(JSON.parse(userid))) {
		// 		var removeArray = userid.replace("[", "(").replace("]", ")").replace(/"/g, "'")
		// 		var filteradd =
		// 			`and "PERSONIDEXTERNAL" IN ${removeArray}`;
		// 	} else {
		// 		var filteradd = `and PERSONIDEXTERNAL='${userid}'`
		// 	}
		// } else {
		// 	var filteradd = ``
		// }
		// employeeList = employeeList + filteradd;
		// var employeevalues = await tx.run(employeeList);
		// let claimcodeListValues = await tx.run(claimcodeList);
		// for (var empid = 0; empid < employeevalues.length; empid++) {
		// var USERID = employeevalues[empid].PERSONIDEXTERNAL;

		var employeeList =
			`SELECT * FROM "SF_EMPJOB" where USERID='${USERID}' AND STARTDATE <= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS') and ENDDATE >= TO_SECONDDATE (CONCAT(CURRENT_DATE, ' 00:00:00'), 'YYYY-MM-DD HH24:MI:SS')`
		var employeevalues = await tx.run(employeeList);

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
				// data.entitlement = parseInt(prorationResult.value) === 0 ? data.entitlement : parseInt(prorationResult.value);
				data.entitlement = prorationResult.error === true ? data.entitlement : parseFloat(prorationResult.value);
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
				        WHERE "EMPLOYEE_ID"='${data.employeeId}' AND
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
				        WHERE "EMPLOYEE_ID"= '${data.employeeId}' AND 
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
				        WHERE "EMPLOYEE_ID"='${data.employeeId}' AND
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
				        WHERE "EMPLOYEE_ID"='${data.employeeId}' AND 
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
	                  WHERE "EMPLOYEE_ID"= '${data.employeeId}' AND
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
	                  WHERE "EMPLOYEE_ID"= '${data.employeeId}' AND
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
				YTD_OTHER: (isNaN(data.YTDOthers) || claimcodeListValues[index].CATEGORY_CODE != 'MC') ? "0.00" : parseFloat(data.YTDOthers).toFixed(2),
				YTD_CONSULT: (isNaN(data.YTDConsultation) || claimcodeListValues[index].CATEGORY_CODE !=  'MC') ? "0.00" : parseFloat(data.YTDConsultation).toFixed(2),
				YTD_WARD_CHARGE: (isNaN(data.YTDWardCharges)|| claimcodeListValues[index].CATEGORY_CODE !=  'MC')  ? "0.00" : parseFloat(data.YTDWardCharges).toFixed(2),
				YTD_HOSPITAL_FEE: (isNaN(data.YTDHospitalFee) || claimcodeListValues[index].CATEGORY_CODE !=  'MC')? "0.00" : parseFloat(data.YTDHospitalFee).toFixed(2),
				PENDING_AMOUNT: isNaN(data.pending) ? "0.00" : parseFloat(data.pending).toFixed(2),
				TAKEN_AMOUNT: isNaN(data.taken) ? "0.00" : parseFloat(data.taken).toFixed(2),
				BALANCE: isNaN(data.balance) ? "0.00" : parseFloat(data.balance).toFixed(2),
				ENTITLEMENT: isNaN(data.entitlement) ? "0.00" : parseFloat(data.entitlement).toFixed(2),
				PAY_GRADE: employeevalues[0].PAYGRADE,
				PERSONAL_AREA: employeevalues[0].COMPANY,
				PERSONAL_SUB_AREA: employeevalues[0].LOCATION,
				DEPARMENT: employeevalues[0].DEPARTMENT,
				DIVISION: employeevalues[0].DIVISION
			});

		}
		// }
		return finalValues;
	};
	async function medicalClaimYTDReport(tx, req) {
		// var userid = req.data.USER_ID;
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
									"CATEGORY_CODE" = 'SP1' OR "CATEGORY_CODE" = 'SP2' OR "CATEGORY_CODE" = 'SP3')`
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
	};
	async function medicalClaimYTDReport_Spawn(tx, req) {
		var userid = req.data.USER_ID;
		console.log("Step Entered")
			// var userid = reportEmployeeExtract(req).length != 0 ? JSON.stringify(reportEmployeeExtract(req)) : '';
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
									"CATEGORY_CODE" = 'SP1' OR "CATEGORY_CODE" = 'SP2' OR "CATEGORY_CODE" = 'SP3')`
		var claimcodeListValues = await tx.run(medicalClaim);

		var employeeList =
			`SELECT * FROM "SF_EMPLOYEEINFORMATIONALL" `

		if (PERSONAL_AREA_IN != '' && PERSONAL_SUB_AREA != '' && PAY_GRADE != '' && DIVISION != '') {
			var filteradd =
				`WHERE PERSONAL_AREA = '${PERSONAL_AREA_IN}' and PERSONAL_SUB_AREA ='${PERSONAL_SUB_AREA}' 
									and PAYGRADE='${PAY_GRADE}' and DIVISION='${DIVISION}'`
		} else {
			var filteradd = ``
		}

		if (userid != "" && userid != null && userid != undefined) {
			if (Array.isArray(JSON.parse(userid))) {
				var removeArray = userid.replace("[", "(").replace("]", ")").replace(/"/g, "'")

				if (filteradd != ``) {
					var filteradd =
						`and "PERSONIDEXTERNAL" IN ${removeArray}`;
				} else {
					var filteradd =
						`WHERE "PERSONIDEXTERNAL" IN ${removeArray}`;
				}

			} else {
				if (filteradd != ``) {
					var filteradd = `and PERSONIDEXTERNAL='${userid}'`
				} else {
					var filteradd = `WHERE PERSONIDEXTERNAL='${userid}'`
				}

			}
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
				var entries = {
						EMPLOYEE: data.employeeId,
						CLAIM_CODE_VALUE: data.Claim_Code,
						DESCRIPTION: claimcodeListValues[index].DESCRIPTION,
						YEAR: CLAIM_YEAR,
						YTD_OTHER: data.YTDOthers,
						YTD_CONSULT: data.YTDConsultation,
						YTD_WARD_CHARGE: data.YTDWardCharges,
						YTD_HOSPITAL_FEE: isNaN(data.YTDHospitalFee) ? "0.00" : data.YTDHospitalFee,
						PENDING_AMOUNT: data.pending,
						TAKEN_AMOUNT: data.taken,
						BALANCE: isNaN(data.balance) ? "0.00" : data.balance,
						ENTITLEMENT: data.entitlement,
						PAY_GRADE: employeevalues[empid].PAYGRADE,
						PERSONAL_AREA: employeevalues[empid].PERSONAL_AREA,
						PERSONAL_SUB_AREA: employeevalues[empid].PERSONAL_SUB_AREA,
						DEPARMENT: employeevalues[empid].DEPARTMENT,
						DIVISION: employeevalues[empid].DIVISION
					}
					// console.log("Step Each Entered")
				let check_proratedClaims = await tx.run(
					`SELECT * from "CALCULATION_PRORATED_CLAIMS_YTD"
						WHERE "EMPLOYEE"= '${entries.EMPLOYEE}' AND "CLAIM_CODE_VALUE" = '${entries.CLAIM_CODE_VALUE}'
						AND "YEAR" = '${entries.YEAR}'`
				);
				if (check_proratedClaims.length == 0) {
					let insertProratedClaims = await tx.run(INSERT.into(PRORATED_CLAIMS_YTD).entries(entries))
				} else {
					let updateProratedClaims = await tx.run(UPDATE(PRORATED_CLAIMS_YTD).set(entries).where({
						EMPLOYEE: entries.EMPLOYEE,
						CLAIM_CODE_VALUE: entries.CLAIM_CODE_VALUE,
						DESCRIPTION: entries.DESCRIPTION,
						YEAR: entries.YEAR
					}))
				}

			}
		}
		// return finalValues;
		// console.log(finalValues);
		return "Prorated YTD Updated"
	}

	function sqlDateTimeFormat() {
		var pad = function (num) {
			return ('00' + num).slice(-2)
		};
		var date;
		date = new Date();
		date = date.getUTCFullYear() + '-' +
			pad(date.getUTCMonth() + 1) + '-' +
			pad(date.getUTCDate()) + ' ' +
			pad(date.getUTCHours()) + ':' +
			pad(date.getUTCMinutes()) + ':' +
			pad(date.getUTCSeconds());

		return date;
	}
}