	//Generate programs list object and choice list
	var pgList = [];
	var prgList = [];
	var pg = new GlideAggregate('x_depar_tagr3_score');
	pg.addAggregate('COUNT');
	//pg.orderBy('program');
	pg.groupBy('program');
	pg.query();

	while(pg.next()){
		var na = pg.getAggregate('COUNT');

		var obj ={};

		obj.name = pg.program.u_subprogram+': '+pg.program.u_subprogram_title.getDisplayValue();
		obj.sys = pg.program.sys_id.getDisplayValue();

		pgList.push(obj);
		prgList.push(pg.program.u_subprogram+': '+pg.program.u_subprogram_title.getDisplayValue());
	}

	data.programList = pgList; //object with program and sysid
	data.program = prgList;//array with only program name


	//Check on Completness


	//Data Transfer
	var prog = '';//set program variable from client
	data.transfer =[];

	if(input){ //triggers update of input variables
		data.transfer = input.transfer;
		prog = data.transfer;//set program variable from client
		calculate();	//triggers calculation to generate
		scoreGenerator(); //trigger score generator	
	}




	//Function to calculate scores and determination	
	function calculate(){

		//********************************************\\
		//**Calculate normalized score for each area**\\
		//********************************************\\
		var scores = []; //hold scores for reporting
		var generate = []; //hold data for final report

		//Create list of Awards
		var pr = new GlideRecord('u_grant');
		pr.addQuery('u_subprogram', prog);
		pr.addQuery('u_pr_award_number', '!=', 'H027A170011');//Marshall Islands Part B
		pr.addQuery('u_pr_award_number', '!=', 'H027A170004');//Virgin Islands Part B
		pr.addQuery('u_pr_award_number', '!=', 'H181A170003');//Virgin Islands Part C
		pr.addQuery('u_pr_award_number', '!=', 'H027A170005');//FSM Part B
		pr.addQuery('u_pr_award_number', '!=', 'H027A170006');//Palau Part B
		pr.addQuery('u_pr_award_number', '!=', 'H027A170012');//America Samoa Part B
		pr.addQuery('u_pr_award_number', '!=', 'H181A170041');//America Samoa Part C
		pr.addQuery('u_pr_award_number', '!=', 'H027A170013');//Guam Part B
		pr.addQuery('u_pr_award_number', '!=', 'H181A170008');//Guam Part C
		pr.addQuery('u_pr_award_number', '!=', 'H027A170106');//Northern Marin Part B
		pr.addQuery('u_pr_award_number', '!=', 'H181A170025');//Northern Marin Part C
		pr.addQuery('u_pr_award_number', '!=', 'H181A170083');//BIA Part C
		pr.query();

		var awards = [];

		while(pr.next()){
			var obj = {};

			obj.prAward = pr.u_pr_award_number.getDisplayValue();
			obj.state = pr.u_duns.u_state.getDisplayValue();
			obj.name = pr.u_duns.u_business_name.getDisplayValue();
			obj.sys = pr.sys_id.getDisplayValue();
			obj.fiscal = 0;
			obj.compliance = 0;
			obj.results = 0;
			obj.ssip = 0;

			awards.push(obj);

			var obj9 = {};
			obj9.award = pr.u_pr_award_number.getDisplayValue();
			obj9.state = pr.u_duns.u_state.getDisplayValue();
			obj9.name = pr.u_duns.u_business_name.getDisplayValue();

			generate.push(obj9); //push to reporting array

		}


		//Create list of Questionnaires with total weights
		var qs = new GlideRecord('x_depar_tagr3_m2m_programs_questionnaires');
		qs.addQuery('program', prog);
		qs.query();

		var qstn = [];

		while (qs.next()){
			var qst = qs.questionnaire;

			// use questionnaire list to find ABS of question weights
			var wtSum = new GlideRecord('x_depar_tagr3_m2m_questions_questionnaires');
			wtSum.addQuery('questionnaire', qst);
			wtSum.query();

			var neg = 0; // var to hold total negative weights
			var sum = 0; // var to hold weighted sum
			while (wtSum.next()){
				sum += Math.abs(wtSum.question_weight);
				if(wtSum.question_weight <0){
					neg += Math.abs(wtSum.question_weight);
				}

			}

			var obj1 = {};
			obj1.questionnaire = qst.getDisplayValue();
			obj1.weightSum = parseFloat(sum);
			obj1.negSum = parseFloat(neg);
			obj1.sys = qst.sys_id.getDisplayValue();

			qstn.push(obj1);

		}    


		//For loops to fill in scores to award list
		for(i=0; i < awards.length; i++){  //Loop through awards

			//need to query by questionnaires
			for (z=0; z< qstn.length; z++){  //inner loop through questionnaires



				//pull scores based on award/questionnaire combo
				var sc = new GlideRecord('x_depar_tagr3_score');
				sc.addQuery('grant', awards[i].sys);
				sc.addQuery('questionnaire', qstn[z].sys);
				sc.query();

				var prScr = 0;

				while(sc.next()){
					var sscr = sc.selected_score.getDisplayValue();
					var den = sc.question.denominator.getDisplayValue();


					//pull question weight
					var wt = new GlideRecord('x_depar_tagr3_m2m_questions_questionnaires');
					wt.addQuery('questionnaire', qstn[z].sys);
					wt.addQuery('question', sc.question);
					wt.setLimit(1);
					wt.query();

					var weight = 0;

					while(wt.next()){
						weight = parseInt(wt.question_weight);

						//pull score data
						var obj5 ={};
						obj5.award = awards[i].prAward;
						obj5.state = awards[i].state;
						obj5.name = awards[i].name;
						obj5.questionnaire = qstn[z].questionnaire;
						obj5.question = sc.question.question.getDisplayValue();
						obj5.answer = sc.selected_answer.answer.getDisplayValue();
						obj5.slctScore = sc.selected_score.getDisplayValue();
						
						if(den != 0){ //if denominator is 0 ignore score
							if(sscr != ""){ // if scores is blank then ignore
									if(weight < 0){
										obj5.score = (1-((parseFloat(sscr.replace(/,/g,'')))/(parseFloat(den.replace(/,/g,'')))))*Math.abs(parseFloat(weight));
										scores.push(obj5);
									}else if(weight > 0){
										obj5.score = ((parseFloat(sscr.replace(/,/g,'')))/(parseFloat(den.replace(/,/g,''))))*parseFloat(weight);
										scores.push(obj5);
									}
								
						}
						}
					}

					//Calculate score sum for award/questionnaire
					if(den != 0 ){ // if denominator is 0 then ignore score
						if(sscr != ""){ //if score is blank then ignore score
						prScr +=  ((parseFloat(sscr.replace(/,/g,''))/parseFloat(den.replace(/,/g,'')))*parseFloat(weight));
						}
					}

				}
				prScr += parseFloat(qstn[z].negSum); //Add negative max to scale score between 0 and 1
				prScr /= parseFloat(qstn[z].weightSum);//Divide score total by questionnaire max points

				//assign score to proper object in array
				if(qstn[z].questionnaire == 'QR00000011' || qstn[z].questionnaire == 'QR00000014'){
					awards[i].results = prScr.toFixed(4);
				}else if(qstn[z].questionnaire == 'QR00000010' || qstn[z].questionnaire == 'QR00000015'){
					awards[i].ssip = prScr.toFixed(4);
				}else if(qstn[z].questionnaire == 'QR00000009' || qstn[z].questionnaire == 'QR00000013'){
					awards[i].compliance = prScr.toFixed(4);
				}else if(qstn[z].questionnaire == 'QR00000008' || qstn[z].questionnaire == 'QR00000012'){
					awards[i].fiscal = prScr.toFixed(4);
				}


			}//end inner loop

		}//end outer loop

		//********************************************\\
		//*******Calculate Total Score Aggregate********\\
		//********************************************\\
		var AggScore=[];

		for(i=0; i<awards.length; i++){
			var score = 0;
			var arr = [];
			arr.push(awards[i].results);
			arr.push(awards[i].compliance);
			arr.push(awards[i].fiscal);
			arr.push(awards[i].ssip);

			//Sum scores
			score = parseFloat(arr[3])+parseFloat(arr[2])+parseFloat(arr[1])+parseFloat(arr[0]);

			awards[i].score = score.toFixed(4);



		}


		//Order Array Function by score
		function compare(b,a) {
			if (a.score < b.score)
				return -1;
			if (a.score > b.score)
				return 1;
			return 0;
		}
		//call function to sort awards array by score
		awards.sort(compare);

		//add ranking to scores
		for(i=0; i<awards.length; i++){
			awards[i].ranking = i+1;
		}

		//Set Thresholds for scores
		var IntFisLmt = 0; //Limit 6
		var IntComLmt = 0;
		var IntSSLmt = 0;
		var IntResLmt = 0;

		var TargFisLmt = 0; //Limit 15
		var TargComLmt = 0;
		var TargSSLmt = 0;
		var TargResLmt = 0;

		var Fquint = 0; //variables to hold upper quintile (i.e. riskiest) lower bound
		var Cquint = 0;
		var Squint = 0;
		var Rquint = 0;	

		var Farr = []; //arrays to hold quintiles for each domain
		var Carr = [];
		var Sarr = [];
		var Rarr = [];

		//push domain scores into arrays
		for(i=0;i<awards.length;i++){
			Farr.push(parseFloat(awards[i].fiscal));
			Carr.push(parseFloat(awards[i].compliance)); 
			Sarr.push(parseFloat(awards[i].ssip));
			Rarr.push(parseFloat(awards[i].results));  
		}


		//Sort Functions for arrays of numbers
		function sortNumber(a,b) {
			return b - a;
		}

		//Order scores in domain arrays from riskiest (highest) to least
		Farr.sort(sortNumber);
		Carr.sort(sortNumber);
		Sarr.sort(sortNumber);
		Rarr.sort(sortNumber);

		//Calculate next score below the top 60% and set as threshold
		Fquint = Farr[Math.floor(Farr.length*6/10)];
		Cquint = Carr[Math.floor(Carr.length*6/10)];
		Squint = Sarr[Math.floor(Sarr.length*6/10)];
		Rquint = Rarr[Math.floor(Rarr.length*6/10)];


		//Waterfall
		//Sort Functions for second spot in array of nested arrays
		function sortSecond(a,b) {
			return b[1] - a[1];
		}

		//function that runs down waterfall and stores determination
		function determinator(dom){
			if(dom == 'fiscalDet'){
				//Run Fiscal Logic
				if(IntFisLmt < 6 && awards[i].fiscal > Fquint && maxInt < 3){
					awards[i].Fdtm = 'Intensive';
					IntFisLmt++;
					maxInt++;
				}else if(TargFisLmt < 15 && awards[i].fiscal > Fquint && maxTar < 3){
					awards[i].Fdtm = 'Targeted';
					TargFisLmt++;
					maxTar++;
				}else{
					awards[i].Fdtm = 'Universal'; 
				}
			}else if(dom == 'complianceDet'){
				//Run Compliance Logic
				if(IntComLmt < 6 && awards[i].compliance > Cquint && maxInt < 3){
					awards[i].Cdtm = 'Intensive';
					IntComLmt++;
					maxInt++;
				}else if(TargComLmt < 15 && awards[i].compliance > Cquint && maxTar < 3){
					awards[i].Cdtm = 'Targeted';
					TargComLmt++;
					maxTar++;
				}else{
					awards[i].Cdtm = 'Universal'; 
				}
			}else if(dom == 'ssipDet'){
				//Run SSIP Logic
				if(IntSSLmt < 6 && awards[i].ssip > Squint && maxInt < 3){
					awards[i].Sdtm = 'Intensive';
					IntSSLmt++;
					maxInt++;
				}else if(TargSSLmt < 15 && awards[i].ssip > Squint && maxTar < 3){
					awards[i].Sdtm = 'Targeted';
					TargSSLmt++;
					maxTar++;
				}else{
					awards[i].Sdtm = 'Universal'; 
				}
			}else{
				//Run Results Logic
				if(IntResLmt < 6 && awards[i].results > Rquint && maxInt < 3){
					awards[i].Rdtm = 'Intensive';
					IntResLmt++;
					maxInt++;
				}else if(TargResLmt < 15 && awards[i].results > Rquint && maxTar < 3){
					awards[i].Rdtm = 'Targeted';
					TargResLmt++;
					maxTar++;
				}else{
					awards[i].Rdtm = 'Universal'; 
				}
			}//end if statement

		}//end determinator function


		//Loop through awards
		for(i=0; i<awards.length; i++){
			var maxInt = 0; //counter for max Intensive of any category set to 3
			var maxTar = 0; //counter for max Targeted of any category set to 3

			var arr3 =[]; // hold domain scores with domain names


			//Find largest Domain Score
			arr3.push(['fiscalDet',parseFloat(awards[i].fiscal)]);
			arr3.push(['complianceDet',parseFloat(awards[i].compliance)]);
			arr3.push(['ssipDet',parseFloat(awards[i].ssip)]);
			arr3.push(['resultsDet',parseFloat(awards[i].results)]);

			arr3.sort(sortSecond);//sort by domain score


			//Loop through array in order
			for(b=0; b<arr3.length; b++){
				awards[i][arr3[b][0]] = determinator(arr3[b][0]);
			}

		}//end awards loop 

		//Assign final awards data to data object

		data.rank = awards;
		data.scoreReport = scores;	//score data
		data.scoreGenerate = generate; //generated reporting data

		//console.log(JSON.stringify(scores));
		//console.log(JSON.stringify(generate));

	}//end calculate function		




	//Start Score Calculator \\
	function scoreGenerator(){

		var reporting = data.scoreGenerate;
		var results = data.scoreReport;

		//console.log(JSON.stringify(reporting));

		for(p=0;p<reporting.length;p++){

			//Domain Arrays
			var domainSSIP = [];
			var domainResult = [];
			var domainFiscal = [];
			var domainComplianceData = [];
			var domainComplianceQual = [];

			//loop results and break into domain arrays
			for(i=0; i<results.length; i++){
				//console.log("hey"+results[0].award);
				//console.log("hey"+reporting[p].award);

				if(results[i].award == reporting[p].award){
					var obj8 = {};
					obj8.state = results[i].state;
					obj8.name = results[i].name;
					obj8.question = results[i].question;
					obj8.score = results[i].score;



					if(results[i].questionnaire == 'QR00000011' || results[i].questionnaire == 'QR00000014'){
						obj8.answer = results[i].answer;
						obj8.slctScore = results[i].slctScore;
						domainResult.push(obj8);

					}else if(results[i].questionnaire == 'QR00000010' || results[i].questionnaire == 'QR00000015'){
						obj8.answer = results[i].answer;
						obj8.slctScore = results[i].slctScore;
						domainSSIP.push(obj8);

					}else if((results[i].questionnaire == 'QR00000009' || results[i].questionnaire == 'QR00000013') && (results[i].answer == "")){

						obj8.slctScore = results[i].slctScore;
						domainComplianceData.push(obj8);

					}else if((results[i].questionnaire == 'QR00000009' || results[i].questionnaire == 'QR00000013') && (results[i].answer != "")){

						obj8.answer = results[i].answer;
						domainComplianceQual.push(obj8);

					}else if(results[i].questionnaire == 'QR00000008' || results[i].questionnaire == 'QR00000012'){
						obj8.answer = results[i].answer;
						obj8.slctScore = results[i].slctScore;
						domainFiscal.push(obj8);
					} 
				}
			}//end domain split loop




			function compare(b,a) {
				if (a.score < b.score)
					return -1;
				if (a.score > b.score)
					return 1;
				return 0;
			}

			//sort arrays highest to lowest score (riskiest to lowest)
			domainSSIP.sort(compare);
			domainResult.sort(compare);
			domainFiscal.sort(compare);
			domainComplianceData.sort(compare);
			domainComplianceQual.sort(compare);

			//console.log(domainSSIP.length);
			console.log(JSON.stringify(domainResult));
			//	console.log(JSON.stringify(domainFiscal));



			for(var i=0; i<6; i++ ){
				if (i == domainSSIP.length) { break; }
				var propNm = "SSIP_"+(i+1)+"Q";
				var propAns = "SSIP_"+(i+1)+"A";
				reporting[p][propNm]= domainSSIP[i].question;
				reporting[p][propAns] = domainSSIP[i].answer+domainSSIP[i].score;
				}

			for(var i=0; i<4; i++ ){ //Results Loop
				if (i == domainResult.length) { break; }
				var propNm = "Results_"+(i+1)+"Q";
				var propAns = "Results_"+(i+1)+"A";
				reporting[p][propNm]= domainResult[i].question;
				reporting[p][propAns] = domainResult[i].answer+domainResult[i].score;
				}

			for(var i=0; i<6; i++ ){ //Fiscal Loop
				if (i == domainFiscal.length) { break; }
				var propNm = "Fiscal_"+(i+1)+"Q";
				var propAns = "Fiscal_"+(i+1)+"A";
				reporting[p][propNm]= domainFiscal[i].question;
				reporting[p][propAns] = domainFiscal[i].answer+domainFiscal[i].score;
			
			}

			for(var i=0; i<3; i++ ){ //Comp Data Loop
				if (i ==  domainComplianceData.length) { break; }
				var propNm = "Compliance_Data_"+(i+1)+"Q";
				var propAns = "Compliance_Data_"+(i+1)+"A";
				reporting[p][propNm]= domainComplianceData[i].question;
				reporting[p][propAns] = domainComplianceData[i].score;
				
			}
			for(var i=0; i<3; i++ ){ //Comp Qual Loop
				if (i == domainComplianceQual.length) { break; }
				var propNm = "Compliance_Qual_"+(i+1)+"Q";
				var propAns = "Compliance_Qual_"+(i+1)+"A";
				reporting[p][propNm]= domainComplianceQual[i].question;
				reporting[p][propAns] = domainComplianceQual[i].answer;
				}

		}//end loop

		data.reportFinal = reporting;

	}//end score function