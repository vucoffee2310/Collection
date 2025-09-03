using System;
using System.Collections;
using System.Data.SQLite;
using System.IO;
using System.Linq;
using com.edc.classbook.util.encryption;
using CustomEntity;

namespace Bookworm.AppCode
{
	// Token: 0x02000049 RID: 73
	public class QuizManager
	{
		// Token: 0x06000579 RID: 1401 RVA: 0x0001DCF1 File Offset: 0x0001BEF1
		public QuizManager(string dbname)
		{
			this.dbname = dbname;
			QuizManager.dbmap = new Hashtable();
			this.clsEncryption = new ClassBookEncryption(1);
			this.examlist = this.loadExercises(-1);
		}

		// Token: 0x0600057A RID: 1402 RVA: 0x0001DD23 File Offset: 0x0001BF23
		public string getDbname()
		{
			return this.dbname;
		}

		// Token: 0x0600057B RID: 1403 RVA: 0x0001DD2B File Offset: 0x0001BF2B
		public Hashtable getExercise()
		{
			return this.examlist;
		}

		// Token: 0x0600057C RID: 1404 RVA: 0x0001DD34 File Offset: 0x0001BF34
		public Hashtable loadExercises(int page = -1)
		{
			this.examlist = new Hashtable();
			try
			{
				if (!File.Exists(this.dbname))
				{
					return this.examlist;
				}
				foreach (Quiz quiz in this.loadExerciseName(-1))
				{
					ArrayList arrayList = (ArrayList)this.examlist[quiz.PageIndex];
					if (arrayList == null)
					{
						arrayList = new ArrayList();
						arrayList.Add(quiz);
						this.examlist.Add(quiz.PageIndex, arrayList);
					}
					else
					{
						arrayList.Add(quiz);
					}
				}
			}
			catch (Exception ex)
			{
				Console.WriteLine(ex.Message);
			}
			return this.examlist;
		}

		// Token: 0x0600057D RID: 1405 RVA: 0x0001DDF8 File Offset: 0x0001BFF8
		public void openDatabase()
		{
			if (this.getDatabase(this.dbname) != null)
			{
				this.closeDatabase(this.dbname);
			}
			if (this.dbname.Equals("default"))
			{
				this.mydb = new SQLiteConnection("Data Source=" + this.dbname + ";Version=3;New=False;Compress=True;");
			}
			else
			{
				this.mydb = new SQLiteConnection("Data Source=" + this.dbname + ";Version=3;New=False;Compress=True;");
			}
			QuizManager.dbmap.Add(this.dbname, this.mydb);
		}

		// Token: 0x0600057E RID: 1406 RVA: 0x0001DE89 File Offset: 0x0001C089
		public void closeDatabase(string dbname)
		{
			SQLiteConnection.ClearAllPools();
			QuizManager.dbmap.Remove(dbname);
		}

		// Token: 0x0600057F RID: 1407 RVA: 0x0001DE9B File Offset: 0x0001C09B
		private SQLiteConnection getDatabase(string dbname)
		{
			return (SQLiteConnection)QuizManager.dbmap[dbname];
		}

		// Token: 0x06000580 RID: 1408 RVA: 0x0001DEB0 File Offset: 0x0001C0B0
		public Quiz[] loadExerciseName(int page = -1)
		{
			Quiz[] array2;
			try
			{
				this.openDatabase();
				string text = "SELECT exam.exam_id, exam.name, exam_page.page_index FROM exam_page, exam WHERE exam_page.exam_id = exam.exam_id";
				if (page > -1)
				{
					text = text + " AND page_index = " + page.ToString();
				}
				SQLiteDataReader sqliteDataReader = this.executeQuery(text);
				Quiz[] array = new Quiz[0];
				int num = 0;
				while (sqliteDataReader.Read())
				{
					Quiz quiz = new Quiz();
					for (int i = 0; i < sqliteDataReader.FieldCount; i++)
					{
						string name = sqliteDataReader.GetName(i);
						string text2 = sqliteDataReader.GetValue(i).ToString();
						if (name.Equals("exam_id"))
						{
							quiz.ExamId = Convert.ToInt32(text2);
						}
						else if (name.Equals("page_index"))
						{
							quiz.PageIndex = Convert.ToInt32(text2);
						}
						else if (name.Equals("name"))
						{
							quiz.Title = this.clsEncryption.decryptString(text2);
						}
					}
					int num2 = array.Count<Quiz>() + 1;
					Array.Resize<Quiz>(ref array, num2);
					array[num++] = quiz;
				}
				array2 = array;
			}
			catch (Exception ex)
			{
				Console.WriteLine(ex.Message);
				array2 = null;
			}
			finally
			{
				this.closeDatabase(this.dbname);
			}
			return array2;
		}

		// Token: 0x06000581 RID: 1409 RVA: 0x0001E00C File Offset: 0x0001C20C
		public SQLiteDataReader executeQuery(string query)
		{
			this.openDatabase();
			SQLiteCommand sqliteCommand = new SQLiteCommand(query, this.mydb);
			sqliteCommand.Connection.Open();
			return sqliteCommand.ExecuteReader();
		}

		// Token: 0x04000302 RID: 770
		private string dbname;

		// Token: 0x04000303 RID: 771
		private Hashtable examlist;

		// Token: 0x04000304 RID: 772
		private SQLiteConnection mydb;

		// Token: 0x04000305 RID: 773
		private ClassBookEncryption clsEncryption;

		// Token: 0x04000306 RID: 774
		public static Hashtable dbmap;
	}
}
