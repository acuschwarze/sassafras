var SEARCH_QUERY = "label:i.s.i.-foundation-scholar-articles is:unread";
var del_emails = false; // Deletes the Google Scholar email as it reads their content otherwise it just marks them as "read"
var send_summary = true; // Sends and email summary of the current top 10 papers in your 
var date_not_query = true; // Adds the date of the email instead of the subject of the google alert
var date_separator = false; // Adds a separator before writing the new papers' list in the GoogleSheet
var del_past = false; // Deletes past list of papers before adding the new one

// Modified version of the code from: https://gist.github.com/oshliaer/70e04a67f1f5fd96a708
// To work with Google Scholar Alerts

function getEmails_(q) {
    var emails = [];
    var threads = GmailApp.search(q);// Searches for unread messages with the google scholar label
    for (var i in threads) {
        var msgs = threads[i].getMessages();
        for (var j in msgs) {
            var listpapers = msgs[j].getPlainBody().split(/\n\n \n/)[0]; // separates Google Scholar signature from the body
            var subject = msgs[j].getSubject(); // gets the Google Scholar Alert search query
            var date = msgs[j].getDate(); // gets the email date
            var papers = listpapers.split(/\r?\n\n/); // creates an array with the text describing each paper
            var numpapers = papers.length;
            for (var k = 0; k < numpapers; k++) {
              var title = papers[k].split('<')[0];// the title is everything before the link to google scholar
//              Logger.log("------------------------------------------------------------------");
//              Logger.log(title);
              if (title.match(/\[CITATION\]/g)){
                continue // ignore the titles that are only a scholar citation link
              }
              title = title.replace('*',''); // if there are any * denoting the found search query for the google scholar alert in the title are removed
              title = title.replace('*','');
              title = title.replace('[HTML] ',''); //
              title = title.replace('[PDF] ',''); // any indication on the format of the paper is removed from the title
              title = title.replace(/\r?\n|\r/g,''); // all linebreaks are removed from the title
              var lines = papers[k].split(/\r?\n/);
              var numlines = lines.length;
              var paper = []
              paper.push(title)
              for (var l = 0; l < numlines; l++) {
                var line = lines[l];
                if (line.indexOf('<') == 0) { // the first line to contain a hyperlink is the link to the article
                  paper.push(lines[l+1]); // the line right after is the list of authors
                  var scholar_url = line.replace('<','').replace('>','');
                  scholar_url = scholar_url.replace(/http:\/\/scholar\.google\.(com|it)\/scholar_url\?url=/g,'');
                  var url = scholar_url.split('&');
                  paper.push(url[0]);
                  break;
                } else {
                  continue
                }
              }
              if (date_not_query) {
               paper.push(date); 
              } else { 
               paper.push(subject);//after the title and author [Google Scholar Alert search query] is added to the paper info being saved
              }
              // HOTFIX
              if (paper.length < 4) {
                for (var fix = 0; fix < 4-paper.length; fix++) {
                  paper.push('something went wrong here')
                }
                } else {
                paper = paper.slice(0,4)
                }
               // END HOTFIX
              emails.push(paper); // the paper is added to the list
         }
         
        }
        if (del_emails) {
          threads[i].moveToTrash() // the message is moved to Trash
        } else {
          threads[i].markRead() // the message is marked as read so it will not pop up again
        }
    }
    return emails;
}
function appendData_(sheet, array2d) {
 if (del_past) {
  var firstRow = sheet.getRange(1, 1, 1, 5).getValues(); // Get values of first row to add later
  sheet.clearContents(); // Clean spreadsheet
  sheet.getRange(1, 1, 1, 5).setValues(firstRow);
    }
 if (date_separator) { //Adding a line with today's time stamp before the new update
  var today = new Date();
  sheet.getRange(sheet.getLastRow() + 1, 1).setValue(today);
 }
  sheet.getRange(sheet.getLastRow() + 1, 1, array2d.length, array2d[0].length).setValues(array2d);
}

function Comparator_(a, b) {
   return a[0].localeCompare(b[0]);
 }
 
function saveEmails() {
    var array2d = getEmails_(SEARCH_QUERY);//creates variable with the output of getEmails_
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet_Papers = ss.getSheetByName('Papers'); //source sheet
    var sheet_Preprints = ss.getSheetByName('PrePrints'); //source sheet
    if (!sheet_Papers) {
     ss.insertSheet('Papers'); // if the papers sheet does not exists it creates them
    }
    if (!sheet_Preprints) {
     ss.insertSheet('PrePrints'); // if the preprints sheet does not exists it creates them
    }
    Logger.log('-----Scraped articles----')
    Logger.log(array2d)
    if (array2d) {//if the variable is not empty deletes repetitions and counts them
      var newPapers = [];
      var newPreprints = [];
      array2d = array2d.sort(Comparator_); // sort the papers' list just created by title alphabetically
      var paperold = array2d[0]; 
      var countpaperold = 0; // counter of multiplicity of titles
      
      var lastRow = sheet_Papers.getLastRow() ;
      var range = sheet_Papers.getRange("A2:G"+lastRow)
      range.sort({column: 1, ascending: true});
      var presentrow = 2;
      var presentpaper = sheet_Papers.getRange(presentrow,1).getValue();
      Logger.log('-----Start conditions for duplicate search----')
      Logger.log(presentpaper);
      
      var lastRow = sheet_Preprints.getLastRow() ;
      var range = sheet_Preprints.getRange("A2:G"+lastRow);
      range.sort({column: 1, ascending: true});
      var presentrow_pp = 2;
      var presentpaper_pp = sheet_Preprints.getRange(presentrow_pp,1).getValue();
      Logger.log(presentpaper_pp);
      
      Logger.log(array2d.length)
      Logger.log('----------Start search----')
      
      for (var i = 0; i < array2d.length; i++){ // Goes through the sorted list
          var paper = array2d[i];
          Logger.log(paper[0])
          if (paperold[0] === paper[0]){ // compares each paper title with the title at previous line - strict match char by char
            Logger.log("+1");
             countpaperold++; // if the title is already present increases the counter
          } else {
             if (paperold[2].match(/(bio|a)rxiv\.org/g)){ // and adds the previous title with its counter to the correct sheet
                 Logger.log("----------check duplicate PP");
                 var not_there = true;
                 while (paperold[0] >= presentpaper_pp){
                   if (paperold[0] === presentpaper_pp){
                     not_there = false;
                     var oldcount_pp = sheet_Preprints.getRange(presentrow_pp,5).getValue();
                     Logger.log('--------------------Present added +1');
                     Logger.log(presentpaper_pp);
                     var cell = sheet_Preprints.getRange(presentrow_pp,5);
                     cell.setValue(oldcount_pp+countpaperold);
                     presentrow_pp++;
                     presentpaper_pp = sheet_Preprints.getRange(presentrow_pp,1).getValue();
                     break
                   } else { 
                     presentrow_pp++; 
                     presentpaper_pp = sheet_Preprints.getRange(presentrow_pp,1).getValue();
                     }
                   }
                       if (not_there) {
                       Logger.log("--------------------adding PP");
                     paperold.push(countpaperold); // if the title is not present appends the counter to the previous title's data
                     newPreprints.push(paperold); // preprints if the link is to ArXiv or Biorxiv
                     }
             } else {
                 Logger.log("----------check duplicate P");
                 var not_there = true;
                 while (paperold[0] >= presentpaper){
                   Logger.log(presentpaper);
                   if (paperold[0] === presentpaper){
                     not_there = false;
                     var oldcount = sheet_Papers.getRange(presentrow,5).getValue();
                     sheet_Papers.getRange(presentrow,5).setValue(oldcount+countpaperold);
                     Logger.log('--------------------Added to it');
                     presentrow++; 
                     presentpaper = sheet_Papers.getRange(presentrow,1).getValue();
                   } else { 
                     presentrow++; 
                     presentpaper = sheet_Papers.getRange(presentrow,1).getValue();
                     }
                   }
                 if (not_there) {
                 Logger.log("--------------------adding P");
                 paperold.push(countpaperold); // if the title is not present appends the counter to the previous title's data
                 newPapers.push(paperold); // papers otherwise
                 }
             }
             var paperold = paper; // Updates the title to be matched to the present one
             var countpaperold = 1; // and resets the counter
          }
       }
       
       if (paperold[2].match(/(bio|a)rxiv\.org/g)){ // and adds the previous title with its counter to the correct sheet
                 Logger.log("----------check duplicate PP");
                 var not_there = true;
                 while (paperold[0] >= presentpaper_pp){
                   if (paperold[0] === presentpaper_pp){
                     not_there = false;
                     var oldcount_pp = sheet_Preprints.getRange(presentrow_pp,5).getValue();
                     Logger.log('--------------------Present added +1');
                     Logger.log(presentpaper_pp);
                     Logger.log(presentrow_pp);
                     var cell = sheet_Preprints.getRange(presentrow_pp,5);
                     cell.setValue(oldcount_pp+countpaperold);
                     presentrow_pp++;
                     presentpaper_pp = sheet_Preprints.getRange(presentrow_pp,1).getValue();
                     break
                   } else { 
                     presentrow_pp++; 
                     presentpaper_pp = sheet_Preprints.getRange(presentrow_pp,1).getValue();
                     }
                   }
                       if (not_there) {
                       Logger.log("--------------------adding PP");
                     paperold.push(countpaperold); // if the title is not present appends the counter to the previous title's data
                     newPreprints.push(paperold); // preprints if the link is to ArXiv or Biorxiv
                     }
             } else {
                 Logger.log("----------check duplicate P");
                 var not_there = true;
                 while (paperold[0] >= presentpaper){
                   Logger.log(presentpaper);
                   if (paperold[0] === presentpaper){
                     not_there = false;
                     var oldcount = sheet_Papers.getRange(presentrow,5).getValue();
                     sheet_Papers.getRange(presentrow,5).setValue(oldcount+countpaperold);
                     Logger.log('--------------------Added to it');
                     presentrow++; 
                     presentpaper = sheet_Papers.getRange(presentrow,1).getValue();
                   } else { 
                     presentrow++; 
                     presentpaper = sheet_Papers.getRange(presentrow,1).getValue();
                     }
                   }
                 if (not_there) {
                 Logger.log("--------------------adding P");
                 paperold.push(countpaperold); // if the title is not present appends the counter to the previous title's data
                 newPapers.push(paperold); // papers otherwise
                 }
             }
       
     if (newPapers.length > 0) {
       appendData_(sheet_Papers, newPapers);//runs appendData_ to the papers sheet
       }
     if (newPreprints.length > 0) {
       appendData_(sheet_Preprints, newPreprints);//runs appendData_ to the preprint sheet
       }
    }
    
    // After all is said and done send a summary email
    if (send_summary) {
      create_email_(newPapers, newPreprints);}
}
