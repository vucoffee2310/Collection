using System;
using System.Collections.Generic;
using System.Data;
using System.Data.Common;
using System.Data.SQLite;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using Bookworm.UserControls.ListBookByLib;
using Bookworm.Utils;
using CustomEntity;
using CustomEntity.Model;
using Dapper;
using Dapper.Contrib.Extensions;

namespace Bookworm.Sqlite
{
	// Token: 0x02000044 RID: 68
	public class DBSqlite
	{
		// Token: 0x17000102 RID: 258
		// (get) Token: 0x06000513 RID: 1299 RVA: 0x0001B0D8 File Offset: 0x000192D8
		public static DBSqlite Instance
		{
			get
			{
				if (DBSqlite.instance == null)
				{
					DBSqlite.instance = new DBSqlite();
				}
				return DBSqlite.instance;
			}
		}

		// Token: 0x06000515 RID: 1301 RVA: 0x0001B120 File Offset: 0x00019320
		public DBSqlite()
		{
			if (!File.Exists(DBSqlite.DB_PATH))
			{
				SQLiteConnection.CreateFile(DBSqlite.DB_PATH);
				this.conn = new SQLiteConnection(DBSqlite.connectionString);
				this.cmd = new SQLiteCommand(this.conn);
				this.conn.Open();
				this.CreateDBTable();
				return;
			}
			this.conn = new SQLiteConnection(DBSqlite.connectionString);
			this.cmd = new SQLiteCommand(this.conn);
			this.conn.Open();
			this.configSchema();
		}

		// Token: 0x06000516 RID: 1302 RVA: 0x0001B228 File Offset: 0x00019428
		private void configSchema()
		{
			if (this.conn.GetSchema("Columns").Select("COLUMN_NAME='CategoryOrder' AND TABLE_NAME='Categories'").Length == 0)
			{
				this.cmd.CommandText = "ALTER TABLE Categories ADD COLUMN CategoryOrder INTEGER";
				this.cmd.CommandType = CommandType.Text;
				this.cmd.ExecuteNonQuery();
			}
		}

		// Token: 0x06000517 RID: 1303 RVA: 0x0001B280 File Offset: 0x00019480
		public void BulkInsertCategories(List<Category> categories)
		{
			try
			{
				string text = "";
				foreach (Category category in categories)
				{
					text = text + string.Format("insert into Categories(CategoryId,CategoryName,ParentId, CategoryOrder) values({0} , '{1}', {2}, {3})", new object[] { category.CategoryId, category.CategoryName, category.ParentId, category.CategoryOrder }) + ";";
				}
				this.cmd.CommandText = text;
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000518 RID: 1304 RVA: 0x0001B348 File Offset: 0x00019548
		public void BulkInsertBookUrl(List<ProductPdf> items)
		{
			try
			{
				this.cmd.CommandText = string.Format("Update Books Set IsDownload=1 where BookId={0}", BienChung.Instance.DataID);
				this.cmd.ExecuteNonQuery();
				foreach (ProductPdf productPdf in items)
				{
					this.cmd.CommandText = string.Format("INSERT INTO BookUrl (CheckSum,DataID,FileSize,FileTitle,Position,Type,Forder,HaveZip) VALUES('{0}', {1}, {2}, '{3}', {4}, '{5}', '{6}',{7}); ", new object[]
					{
						productPdf.CheckSum,
						BienChung.Instance.DataID,
						productPdf.FileSize,
						productPdf.FileTitle,
						productPdf.Position,
						productPdf.Type,
						productPdf.Forder,
						productPdf.HaveZip
					});
					this.cmd.ExecuteNonQuery();
				}
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000519 RID: 1305 RVA: 0x0001B460 File Offset: 0x00019660
		public void DelelteBookUrl(int DataID)
		{
			try
			{
				this.cmd.CommandText = string.Format("DELETE FROM BookUrl WHERE DataID={0}", DataID);
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600051A RID: 1306 RVA: 0x0001B4AC File Offset: 0x000196AC
		public BookRead GetBookReadPositon(long DataID)
		{
			BookRead bookRead;
			try
			{
				string text = string.Format("select BookId,positionRead from Books where BookId ={0}", DataID);
				bookRead = this.cmd.Connection.QueryFirstOrDefault(text, null, null, null, null);
			}
			catch (Exception)
			{
				bookRead = null;
			}
			return bookRead;
		}

		// Token: 0x0600051B RID: 1307 RVA: 0x0001B508 File Offset: 0x00019708
		public void UpdateBookReadPositon(BookRead item)
		{
			try
			{
				this.cmd.CommandText = string.Format("Update Books set  positionRead={0} where BookId ={1}", item.positionRead, item.BookId);
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600051C RID: 1308 RVA: 0x0001B564 File Offset: 0x00019764
		public void UpdateBookReadTime(ProductPdf item)
		{
			try
			{
				this.cmd.CommandText = string.Format("Update BookUrl set  secondRead={0} where DataID ={1} and Position={2}", item.secondRead, BienChung.Instance.DataID, item.Position);
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600051D RID: 1309 RVA: 0x0001B5CC File Offset: 0x000197CC
		public List<ProductPdf> GetBookUrl(long DataID)
		{
			List<ProductPdf> list;
			try
			{
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = string.Format("select * from BookUrl where DataID ={0} ORDER  by Position", DataID);
				dataTable.Load(this.cmd.ExecuteReader());
				list = UtilContants.ConvertDataTableToList<ProductPdf>(dataTable);
			}
			catch (Exception)
			{
				list = new List<ProductPdf>();
			}
			return list;
		}

		// Token: 0x0600051E RID: 1310 RVA: 0x0001B62C File Offset: 0x0001982C
		public List<Book> GetBookBorrowed(int nameObject, string userName)
		{
			List<Book> list2;
			try
			{
				List<Book> list = new List<Book>();
				if (nameObject.Equals("ucBookShelf"))
				{
					list.Add(new Book());
				}
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = string.Format("SELECT * from Books b  where b.UserName = '{0}';", userName);
				dataTable.Load(this.cmd.ExecuteReader());
				list = UtilContants.ConvertDataTableToList<Book>(dataTable);
				list2 = list;
			}
			catch (Exception)
			{
				list2 = new List<Book>();
			}
			return list2;
		}

		// Token: 0x0600051F RID: 1311 RVA: 0x0001B6A8 File Offset: 0x000198A8
		public Book GetBook(long productId)
		{
			Book book2;
			try
			{
				string text = string.Format("SELECT * from Books b  where b.BookId = {0};", productId);
				Book book = this.cmd.Connection.QueryFirstOrDefault(text, null, null, null, null);
				if (book != null)
				{
					book2 = book;
				}
				else
				{
					book2 = null;
				}
			}
			catch (Exception)
			{
				book2 = null;
			}
			return book2;
		}

		// Token: 0x06000520 RID: 1312 RVA: 0x0001B714 File Offset: 0x00019914
		public void BulkInsertLibrary(LibraryResult lstlibrary)
		{
			try
			{
				foreach (Library library in lstlibrary.Library)
				{
					this.cmd.CommandText = string.Format(this.InsertLibraryCommand(), new object[] { library.ID, library.Name, library.Domain, library.DonViID });
					this.cmd.ExecuteNonQuery();
				}
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000521 RID: 1313 RVA: 0x0001B7C8 File Offset: 0x000199C8
		private void CreateDBTable()
		{
			this.cmd.CommandText = this.strCreateLibraryDB;
			this.cmd.ExecuteNonQuery();
			this.cmd.CommandText = this.strCreateCategoryDB;
			this.cmd.ExecuteNonQuery();
			this.cmd.CommandText = this.strCreateBookDB;
			this.cmd.ExecuteNonQuery();
			this.cmd.CommandText = this.strCreateNote;
			this.cmd.ExecuteNonQuery();
			this.cmd.CommandText = this.strCreateUser;
			this.cmd.ExecuteNonQuery();
			this.cmd.CommandText = this.strCreateBookmark;
			this.cmd.ExecuteNonQuery();
			this.cmd.CommandText = this.strCreateBookUrl;
			this.cmd.ExecuteNonQuery();
			this.cmd.CommandText = this.strThoiGianDoc;
			this.cmd.ExecuteNonQuery();
			this.cmd.CommandText = this.strThongBao;
			this.cmd.ExecuteNonQuery();
			this.cmd.CommandText = this.strCreateBookDocDuDinhDB;
			this.cmd.ExecuteNonQuery();
			this.cmd.CommandText = this.strCreateOptionDB;
			this.cmd.ExecuteNonQuery();
		}

		// Token: 0x06000522 RID: 1314 RVA: 0x0001B914 File Offset: 0x00019B14
		public string SelectOption(string Id)
		{
			string text;
			try
			{
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = string.Format("SELECT * from Option b  where  b.Id = '{0}' Limit 1;", Id);
				dataTable.Load(this.cmd.ExecuteReader());
				List<OptionValue> list = UtilContants.ConvertDataTableToList<OptionValue>(dataTable);
				if (list.Count > 0)
				{
					text = list[0].Value;
				}
				else if (Id == "phienban")
				{
					this.InsertUpdateOption("phienban", "2.0", true);
					text = "2.0";
				}
				else
				{
					text = "";
				}
			}
			catch (Exception)
			{
				text = "";
			}
			return text;
		}

		// Token: 0x06000523 RID: 1315 RVA: 0x0001B9B4 File Offset: 0x00019BB4
		public void InsertUpdateOption(string Id, string value, bool insert)
		{
			try
			{
				if (insert)
				{
					this.cmd.CommandText = string.Format("Insert Into Option (name,value) values ('{0}','{1}')", Id, value);
					this.cmd.ExecuteNonQuery();
				}
				else
				{
					this.cmd.CommandText = string.Format("Update Option Set value ='{0}' where Id ='{1}'", value, Id);
					this.cmd.ExecuteNonQuery();
				}
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000524 RID: 1316 RVA: 0x0001BA24 File Offset: 0x00019C24
		public void DeleteAccount(long libraryID)
		{
			try
			{
				this.cmd.CommandText = string.Format("DELETE FROM Account WHERE LibraryID = {0}", libraryID);
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x17000103 RID: 259
		// (get) Token: 0x06000525 RID: 1317 RVA: 0x0001BA70 File Offset: 0x00019C70
		// (set) Token: 0x06000526 RID: 1318 RVA: 0x0001BA78 File Offset: 0x00019C78
		public int edataId { get; set; }

		// Token: 0x06000527 RID: 1319 RVA: 0x0001BA84 File Offset: 0x00019C84
		public void DeleteAllBooks(long libraryID)
		{
			try
			{
				this.cmd.CommandText = string.Format("select BookId from Books where IsReading = 1  LIMIT 1;", Array.Empty<object>());
				this.edataId = Convert.ToInt32(this.cmd.ExecuteScalar());
				this.cmd.CommandText = string.Format("Delete from Books WHERE LibraryID = {0}", libraryID);
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000528 RID: 1320 RVA: 0x0001BB00 File Offset: 0x00019D00
		public void DeleteAllCategories()
		{
			try
			{
				this.cmd.CommandText = "delete from Categories";
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000529 RID: 1321 RVA: 0x0001BB40 File Offset: 0x00019D40
		public void DeleteAllLibrary()
		{
			try
			{
				this.cmd.CommandText = "delete from Libraries";
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600052A RID: 1322 RVA: 0x0001BB80 File Offset: 0x00019D80
		public void DeleteBookMark(string bookCode, long pageNumber)
		{
			try
			{
				this.cmd.CommandText = string.Format("DELETE FROM BookMark WHERE BookCode like '%{0}%' AND  PageNumber = {1}", bookCode, pageNumber);
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600052B RID: 1323 RVA: 0x0001BBCC File Offset: 0x00019DCC
		public void DeleteBorrowBook(string bookCode)
		{
			try
			{
				this.cmd.CommandText = string.Format("DELETE FROM Books WHERE BookCode = '{0}'", bookCode);
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600052C RID: 1324 RVA: 0x0001BC10 File Offset: 0x00019E10
		public void DeleteNote(long id)
		{
			try
			{
				this.cmd.CommandText = string.Format("DELETE FROM Notes WHERE ID = {0}", id);
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600052D RID: 1325 RVA: 0x0001BC5C File Offset: 0x00019E5C
		public List<BookMark> GetAllBookMarkByBookCode(string bookCode)
		{
			List<BookMark> list = new List<BookMark>();
			try
			{
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = string.Format("select * from BookMark where  BookCode like '%{0}%';", bookCode);
				dataTable.Load(this.cmd.ExecuteReader());
				if (dataTable.Rows.Count > 0)
				{
					list = UtilContants.ConvertDataTableToList<BookMark>(dataTable);
				}
			}
			catch (Exception)
			{
			}
			return list;
		}

		// Token: 0x0600052E RID: 1326 RVA: 0x0001BCC8 File Offset: 0x00019EC8
		public List<Book> GetBookBorrowed(string nameObject, string userName)
		{
			List<Book> list2;
			try
			{
				List<Book> list = new List<Book>();
				if (nameObject.Equals("ucBookShelf"))
				{
					list.Add(new Book());
				}
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = string.Format("SELECT * from Books b  where b.UserName = '{0}' order by IsReading DESC", userName);
				dataTable.Load(this.cmd.ExecuteReader());
				list = UtilContants.ConvertDataTableToList<Book>(dataTable);
				list2 = list;
			}
			catch (Exception)
			{
				list2 = new List<Book>();
			}
			return list2;
		}

		// Token: 0x0600052F RID: 1327 RVA: 0x0001BD44 File Offset: 0x00019F44
		public bool HaveBook(long productID, string userName)
		{
			bool flag = true;
			try
			{
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = string.Format("SELECT * from Books b  where  b.BookId = '{0}' and b.UserName = '{1}' Limit 1;", productID, userName);
				dataTable.Load(this.cmd.ExecuteReader());
				if (UtilContants.ConvertDataTableToList<Book>(dataTable).Count == 0)
				{
					flag = false;
				}
			}
			catch (Exception)
			{
			}
			return flag;
		}

		// Token: 0x06000530 RID: 1328 RVA: 0x0001BDAC File Offset: 0x00019FAC
		public BookMark GetBookMarkByPageNumber(string bookCode, int pageNumber)
		{
			BookMark bookMark = new BookMark();
			try
			{
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = string.Format("select * from BookMark where BookCode like '%{0}%' AND  PageNumber = {1} LIMIT 1;", bookCode, pageNumber);
				dataTable.Load(this.cmd.ExecuteReader());
				if (dataTable.Rows.Count > 0)
				{
					bookMark = UtilContants.GetItem<BookMark>(dataTable.Rows[0]);
				}
			}
			catch (Exception)
			{
			}
			return bookMark;
		}

		// Token: 0x06000531 RID: 1329 RVA: 0x0001BE28 File Offset: 0x0001A028
		public int GetCountListBook()
		{
			int num = 0;
			try
			{
				if (this.conn.State != ConnectionState.Open)
				{
					this.conn.Open();
					this.GetCountListLibraries();
				}
				else
				{
					string text = string.Format("SELECT count(*) as count FROM Books", Array.Empty<object>());
					this.cmd.CommandText = text;
					num = (int)Convert.ToInt16(this.cmd.ExecuteScalar());
				}
			}
			catch (Exception)
			{
			}
			return num;
		}

		// Token: 0x06000532 RID: 1330 RVA: 0x0001BE9C File Offset: 0x0001A09C
		public int GetCountListLibraries()
		{
			int num = 0;
			try
			{
				if (this.conn.State != ConnectionState.Open)
				{
					this.conn.Open();
					this.GetCountListLibraries();
				}
				else
				{
					string text = string.Format("SELECT count(*) as count FROM Libraries", Array.Empty<object>());
					this.cmd.CommandText = text;
					num = (int)Convert.ToInt16(this.cmd.ExecuteScalar());
				}
			}
			catch (Exception)
			{
			}
			return num;
		}

		// Token: 0x06000533 RID: 1331 RVA: 0x0001BF10 File Offset: 0x0001A110
		public List<Library> GetLibraries()
		{
			List<Library> list = new List<Library>();
			try
			{
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = "select * from Libraries";
				dataTable.Load(this.cmd.ExecuteReader());
				list = UtilContants.ConvertDataTableToList<Library>(dataTable);
			}
			catch (Exception)
			{
			}
			return list;
		}

		// Token: 0x06000534 RID: 1332 RVA: 0x0001BF68 File Offset: 0x0001A168
		public List<Library> GetLibrariesChoose()
		{
			List<Library> list = new List<Library>();
			try
			{
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = "select * from Libraries where isChoosed = 1";
				dataTable.Load(this.cmd.ExecuteReader());
				list = UtilContants.ConvertDataTableToList<Library>(dataTable);
			}
			catch (Exception)
			{
			}
			return list;
		}

		// Token: 0x06000535 RID: 1333 RVA: 0x0001BFC0 File Offset: 0x0001A1C0
		public List<Library> GetLibrariesSearchResult(string libraryName)
		{
			List<Library> list = new List<Library>();
			try
			{
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = string.Format("select * from Libraries where  Name like '%{0}%';", libraryName);
				dataTable.Load(this.cmd.ExecuteReader());
				list = UtilContants.ConvertDataTableToList<Library>(dataTable);
			}
			catch (Exception)
			{
			}
			return list;
		}

		// Token: 0x06000536 RID: 1334 RVA: 0x0001C01C File Offset: 0x0001A21C
		public Library GetLibraryByID(long libraryID)
		{
			Library library = new Library();
			try
			{
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = string.Format("select * from Libraries where ID = {0} LIMIT 1;", libraryID);
				dataTable.Load(this.cmd.ExecuteReader());
				if (dataTable.Rows.Count > 0)
				{
					library = UtilContants.GetItem<Library>(dataTable.Rows[0]);
				}
			}
			catch (Exception)
			{
			}
			return library;
		}

		// Token: 0x06000537 RID: 1335 RVA: 0x0001C098 File Offset: 0x0001A298
		public Book GetReadingBook(string bookCode)
		{
			Book book = new Book();
			try
			{
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = string.Format("SELECT * FROM Books WHERE BookCode = '{0}' LIMIT 1;", bookCode);
				dataTable.Load(this.cmd.ExecuteReader());
				if (dataTable.Rows.Count <= 0)
				{
					book = null;
				}
				else
				{
					book = UtilContants.GetItem<Book>(dataTable.Rows[0]);
				}
			}
			catch (Exception)
			{
			}
			return book;
		}

		// Token: 0x06000538 RID: 1336 RVA: 0x0001C114 File Offset: 0x0001A314
		public DataTable GetSearchLibraries(string libraryName)
		{
			DataTable dataTable = null;
			try
			{
				if (this.conn.State != ConnectionState.Open)
				{
					this.conn.Open();
					this.GetSearchLibraries(libraryName);
				}
				else
				{
					string text = string.Format("select * from Libraries where  Name like '%{0}%';", libraryName);
					this.cmd.CommandText = text;
					DbDataAdapter dbDataAdapter = new SQLiteDataAdapter(this.cmd);
					dataTable = new DataTable("Library");
					dbDataAdapter.Fill(dataTable);
				}
			}
			catch (Exception)
			{
			}
			return dataTable;
		}

		// Token: 0x06000539 RID: 1337 RVA: 0x0001C194 File Offset: 0x0001A394
		public void InsertAccount(Account account, long libraryID)
		{
			try
			{
				this.cmd.CommandText = string.Format("INSERT INTO Account( UserID, UserName, Token, LibraryID, UserPassword, KeepLoggedIn,FullName,Mobile,Email,AllowUpload) values ('{0}', '{1}', '{2}', {3}, '{4}', {5}, '{6}','{7}','{8}',{9})", new object[] { account.UserID, account.UserName, account.Token, libraryID, account.UserPassword, account.KeepLoggedIn, account.FullName, account.Mobile, account.Email, account.AllowUpload });
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600053A RID: 1338 RVA: 0x0001C248 File Offset: 0x0001A448
		public void UpdateAccount(Account account)
		{
			this.cmd.CommandText = string.Format("UPDATE Account SET FullName = '{0}',Mobile='{1}',Email='{2}' WHERE UserID = {3} AND LibraryID = {4}; ", new object[]
			{
				account.FullName,
				account.Mobile,
				account.Email,
				account.UserID,
				MainApp.currentLibrary.ID
			});
			this.cmd.ExecuteNonQuery();
		}

		// Token: 0x0600053B RID: 1339 RVA: 0x0001C2B8 File Offset: 0x0001A4B8
		public void InsertBookMark(BookMark bookMark)
		{
			try
			{
				this.cmd.CommandText = string.Format("INSERT INTO BookMark( BookCode, PageNumber) values ('{0}', {1})", bookMark.BookCode, bookMark.PageNumber);
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600053C RID: 1340 RVA: 0x0001C30C File Offset: 0x0001A50C
		public void InsertBooks(List<Book> listBooks)
		{
			string text = "";
			try
			{
				if (listBooks.Count > 0)
				{
					string text2 = Common.FOLDER_IMAGE + listBooks[0].LibraryId;
					if (!Directory.Exists(text2))
					{
						Directory.CreateDirectory(text2);
					}
					foreach (Book book in listBooks)
					{
						string text3 = ((!string.IsNullOrEmpty(book.Author)) ? book.Author.Replace("'", "''") : string.Empty);
						if (string.IsNullOrEmpty(book.BookName))
						{
							string empty = string.Empty;
						}
						else
						{
							book.BookName.Replace("'", "''");
						}
						if (!string.IsNullOrEmpty(book.BookCover))
						{
							string text4;
							if (string.IsNullOrEmpty(book.CoverPicName))
							{
								text4 = text2 + book.BookCode + ".jpg";
								try
								{
									File.Delete(text4);
									goto IL_00F3;
								}
								catch
								{
									goto IL_00F3;
								}
								goto IL_00E0;
							}
							goto IL_00E0;
							IL_00F3:
							if (!File.Exists(text4))
							{
								try
								{
									new WebClient().DownloadFile(book.BookCover, text4);
								}
								catch (Exception)
								{
								}
							}
							book.BookCover = text4;
							goto IL_011B;
							IL_00E0:
							text4 = text2 + book.CoverPicName + ".jpg";
							goto IL_00F3;
						}
						IL_011B:
						DataTable dataTable = new DataTable();
						this.cmd.CommandText = string.Format("Select DataID From BookUrl where DataId ={0} limit 1", book.BookId);
						dataTable.Load(this.cmd.ExecuteReader());
						if (dataTable.Rows.Count >= 1)
						{
							book.IsDownload = true;
						}
						BookSql bookSql = new BookSql
						{
							BookId = book.BookId,
							Author = text3,
							BookCode = book.BookCode,
							BookCover = book.BookCover,
							BookName = book.BookName,
							Dadoc = 0,
							DaThietLapThoiGian = false,
							DonViID = MainApp.currentLibrary.DonViID,
							GetDataDate = DateTime.Now,
							IsDownload = book.IsDownload,
							IsReading = false,
							LibraryDomain = MainApp.currentLibrary.Domain,
							LibraryId = MainApp.currentLibrary.ID,
							LibraryName = MainApp.currentLibrary.Name,
							NamXuatBan = book.NamXuatBan,
							NhaXuatBan = book.NhaXuatBan,
							RemainDate = book.RemainDate.Value,
							UserName = book.UserName,
							UserPassword = MainApp.UserPassword
						};
						if ((long)this.edataId == bookSql.BookId)
						{
							bookSql.IsReading = true;
						}
						this.cmd.Connection.Insert(bookSql, null, null);
					}
				}
			}
			catch (Exception ex)
			{
				UtilContants.LogError("SQliet", ex.Message + "Sql" + text, true);
			}
		}

		// Token: 0x0600053D RID: 1341 RVA: 0x0001C648 File Offset: 0x0001A848
		public void InsertBooks(ProductDetail product, Library library, string curUserName)
		{
			try
			{
				this.cmd.CommandText = string.Concat(new object[]
				{
					"insert into Books(Author,BookCode,BookCover,BookID,BookName,LibraryId,LibraryDomain,LibraryName,UserName,DonViId) values('", product.Author, "','", product.ProductCode, "' ,'", product.ProductCover, "','", product.ID, "', '", product.ProductTitle,
					"', '", library.ID, "', '", library.Domain, "', '", library.Name, "', '", curUserName, "', '', '", library.DonViID,
					"');"
				});
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600053E RID: 1342 RVA: 0x0001C758 File Offset: 0x0001A958
		public List<Category> GetAllCategories()
		{
			List<Category> list = new List<Category>();
			try
			{
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = string.Format("select * from Categories x ORDER by x.ParentId,x.CategoryOrder ", Array.Empty<object>());
				dataTable.Load(this.cmd.ExecuteReader());
				if (dataTable.Rows.Count > 0)
				{
					list = UtilContants.ConvertDataTableToList<Category>(dataTable);
				}
			}
			catch (Exception)
			{
			}
			return list;
		}

		// Token: 0x0600053F RID: 1343 RVA: 0x0001C7C8 File Offset: 0x0001A9C8
		public List<CategoriesViewModel> GetCategories(int parentId)
		{
			List<CategoriesViewModel> list = new List<CategoriesViewModel>();
			try
			{
				string text = string.Format("select *,(select exists( select 1 from Categories where ParentId = x.CategoryId)) as HaveCon from Categories x  where parentId = {0} ORDER by x.CategoryOrder", parentId);
				list = this.cmd.Connection.Query(text, null, null, true, null, null).ToList<CategoriesViewModel>();
			}
			catch (Exception)
			{
			}
			return list;
		}

		// Token: 0x06000540 RID: 1344 RVA: 0x0001C830 File Offset: 0x0001AA30
		public void InsertLibraries(LibraryResult lstlibrary)
		{
			try
			{
				if (this.conn.State != ConnectionState.Open)
				{
					this.conn.Open();
					this.InsertLibraries(lstlibrary);
				}
				else
				{
					foreach (Library library in lstlibrary.Library)
					{
						this.cmd.CommandText = string.Concat(new object[] { "insert into Libraries(ID,Name,Domain,DonViID) values(", library.ID, ",'", library.Name, "' ,'", library.Domain, "','", library.DonViID, "');" });
						this.cmd.ExecuteNonQuery();
					}
				}
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000541 RID: 1345 RVA: 0x0001C934 File Offset: 0x0001AB34
		public long InsertLibrary(Library library)
		{
			long num = 0L;
			try
			{
				this.cmd.CommandText = string.Format(this.InsertLibraryCommand(), new object[] { library.ID, library.Name, library.Domain, library.DonViID });
				this.cmd.ExecuteNonQuery();
				this.cmd.CommandText = "select last_insert_rowid()";
				num = (long)this.cmd.ExecuteScalar();
			}
			catch (Exception)
			{
			}
			return num;
		}

		// Token: 0x06000542 RID: 1346 RVA: 0x0001C9D4 File Offset: 0x0001ABD4
		private string InsertLibraryCommand()
		{
			StringBuilder stringBuilder = new StringBuilder();
			try
			{
				stringBuilder.AppendLine("insert into Libraries(ID,Name,Domain,DonViID,isChoosed)");
				stringBuilder.AppendLine("SELECT {0}, '{1}', '{2}', '{3}', 0");
				stringBuilder.AppendLine("WHERE NOT EXISTS(SELECT 1 FROM Libraries WHERE ID = {0})");
			}
			catch (Exception)
			{
			}
			return stringBuilder.ToString();
		}

		// Token: 0x06000543 RID: 1347 RVA: 0x0001CA28 File Offset: 0x0001AC28
		public long InsertNote(Note note)
		{
			long num = 0L;
			try
			{
				num = this.cmd.Connection.Insert(note, null, null);
			}
			catch (Exception)
			{
			}
			return num;
		}

		// Token: 0x06000544 RID: 1348 RVA: 0x0001CA6C File Offset: 0x0001AC6C
		public bool IsBookExistDatabase(long bookId)
		{
			bool flag = false;
			try
			{
				string text = string.Format("Select count(*) from Books where BookId = " + bookId, Array.Empty<object>());
				this.cmd.CommandText = text;
				flag = Convert.ToInt16(this.cmd.ExecuteScalar()) > 0;
			}
			catch (Exception)
			{
			}
			return flag;
		}

		// Token: 0x06000545 RID: 1349 RVA: 0x0001CAD0 File Offset: 0x0001ACD0
		public Account SelectAccountByLibraryID(long libraryID)
		{
			Account account = new Account();
			try
			{
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = string.Format("select * from Account where LibraryID = {0} LIMIT 1;", libraryID);
				dataTable.Load(this.cmd.ExecuteReader());
				if (dataTable.Rows.Count > 0)
				{
					account = UtilContants.GetItem<Account>(dataTable.Rows[0]);
				}
			}
			catch (Exception)
			{
			}
			return account;
		}

		// Token: 0x06000546 RID: 1350 RVA: 0x0001CB4C File Offset: 0x0001AD4C
		public List<Note> SelectAllNoteByPageNumberAndBookID(string PageNumber, string BookID)
		{
			List<Note> list = new List<Note>();
			try
			{
				string text = string.Format("select * from Notes where PageNumber = '{0}' and BookID = '{1}';", PageNumber, BookID);
				list = this.cmd.Connection.Query(text, null, null, true, null, null).ToList<Note>();
			}
			catch (Exception)
			{
			}
			return list;
		}

		// Token: 0x06000547 RID: 1351 RVA: 0x0001CBB0 File Offset: 0x0001ADB0
		public Note SelectNoteByID(long id)
		{
			Note note = new Note();
			try
			{
				string text = string.Format("select * from Notes where ID = {0};", id);
				note = this.cmd.Connection.QueryFirstOrDefault(text, null, null, null, null);
			}
			catch (Exception)
			{
			}
			return note;
		}

		// Token: 0x06000548 RID: 1352 RVA: 0x0001CC10 File Offset: 0x0001AE10
		public Book SelectReadingBook()
		{
			Book book = new Book();
			try
			{
				DataTable dataTable = new DataTable();
				this.cmd.CommandText = string.Format("select * from Books where IsReading = 1  LIMIT 1;", Array.Empty<object>());
				dataTable.Load(this.cmd.ExecuteReader());
				if (dataTable.Rows.Count > 0)
				{
					book = UtilContants.GetItem<Book>(dataTable.Rows[0]);
				}
			}
			catch (Exception)
			{
			}
			return book;
		}

		// Token: 0x06000549 RID: 1353 RVA: 0x0001CC8C File Offset: 0x0001AE8C
		public void UpdateNote(Note note)
		{
			try
			{
				this.cmd.CommandText = string.Format("UPDATE Notes SET BookID = '{0}', PageNumber = '{1}', NoteText = '{2}', X = {3}, Y = {4}, Mode = {5} WHERE ID = {6}", new object[] { note.BookID, note.PageNumber, note.NoteText, note.X, note.Y, note.Mode, note.ID });
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600054A RID: 1354 RVA: 0x0001CD28 File Offset: 0x0001AF28
		public void UpdateReadingBook(string bookCode)
		{
			try
			{
				this.cmd.CommandText = string.Format("UPDATE Books SET IsReading = 0; UPDATE Books SET IsReading = 1 WHERE BookCode = '{0}'", bookCode);
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600054B RID: 1355 RVA: 0x0001CD6C File Offset: 0x0001AF6C
		public void UpdatetLibrariesChoosed(Library library)
		{
			try
			{
				if (this.conn.State != ConnectionState.Open)
				{
					this.conn.Open();
					this.UpdatetLibrariesChoosed(library);
				}
				else
				{
					DbCommand dbCommand = this.cmd;
					long id = library.ID;
					dbCommand.CommandText = string.Format(this.UpdateLibChosed(), new object[] { library.ID, library.Name, library.Domain, library.DonViID });
					this.cmd.ExecuteNonQuery();
				}
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600054C RID: 1356 RVA: 0x0001CE10 File Offset: 0x0001B010
		private string UpdateLibChosed()
		{
			StringBuilder stringBuilder = new StringBuilder();
			try
			{
				stringBuilder.AppendLine("Delete From Libraries Where ID = {0};");
				stringBuilder.AppendLine("insert into Libraries(ID,Name,Domain,DonViID,isChoosed)");
				stringBuilder.AppendLine("Values( {0}, '{1}', '{2}', '{3}', 1)");
			}
			catch (Exception)
			{
			}
			return stringBuilder.ToString();
		}

		// Token: 0x0600054D RID: 1357 RVA: 0x0001CE64 File Offset: 0x0001B064
		public void DeleteLib(long libID)
		{
			try
			{
				this.cmd.CommandText = string.Format("DELETE FROM Libraries WHERE ID = {0} ", libID);
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600054E RID: 1358 RVA: 0x0001CEB0 File Offset: 0x0001B0B0
		public void UpdateUserToken(long UserID, string UserToken)
		{
			try
			{
				this.cmd.CommandText = string.Format("UPDATE Account SET Token = '{0}' WHERE UserID = {1}", UserToken, UserID);
				this.cmd.ExecuteNonQuery();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600054F RID: 1359 RVA: 0x0001CEFC File Offset: 0x0001B0FC
		public void InsertThoiGianDoc(ThoiGianDoc item)
		{
			try
			{
				this.cmd.Connection.Insert(item, null, null);
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000550 RID: 1360 RVA: 0x0001CF3C File Offset: 0x0001B13C
		public IEnumerable<ThoiGianDoc> GetThoiGianDoc()
		{
			IEnumerable<ThoiGianDoc> enumerable;
			try
			{
				if (MainApp.currentLibrary.Domain != string.Empty)
				{
					string text = string.Format("SELECT * from ThoiGianDoc tgd where tgd.DaUpdate =FALSE and ThoiGian>0 and LibId={0}", MainApp.currentLibrary.ID);
					enumerable = this.cmd.Connection.Query(text, null, null, true, null, null);
				}
				else
				{
					enumerable = null;
				}
			}
			catch (Exception)
			{
				enumerable = null;
			}
			return enumerable;
		}

		// Token: 0x06000551 RID: 1361 RVA: 0x0001CFBC File Offset: 0x0001B1BC
		public void UpDateThoiGianDoc(List<ThoiGianDoc> items)
		{
			try
			{
				this.cmd.Connection.UpdateAsync(items, null, null);
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000552 RID: 1362 RVA: 0x0001CFFC File Offset: 0x0001B1FC
		public void InsertThoiGianThietLap(ThoiGianThietLap item)
		{
			try
			{
				string text = string.Format("DELETE FROM BookThoiGianDuDinh WHERE BookId ={0} and LibId={1}", item.BookId, item.LibId);
				this.cmd.Connection.Execute(text, null, null, null, null);
				this.cmd.Connection.Insert(item, null, null);
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000553 RID: 1363 RVA: 0x0001D084 File Offset: 0x0001B284
		public void DeleteThoiGianThietLap(long bookId)
		{
			try
			{
				string text = string.Format("DELETE FROM BookThoiGianDuDinh WHERE BookId ={0}", bookId);
				this.cmd.Connection.Execute(text, null, null, null, null);
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000554 RID: 1364 RVA: 0x0001D0E0 File Offset: 0x0001B2E0
		public ThoiGianThietLap GetThoiGianThietLap(long bookId)
		{
			ThoiGianThietLap thoiGianThietLap;
			try
			{
				string text = string.Format("SELECT * from BookThoiGianDuDinh tgd where tgd.BookId ={0} and LibId={1} and UserId ={2}", bookId, MainApp.currentLibrary.ID, MainApp.LoggedUserID);
				IEnumerable<ThoiGianThietLap> enumerable = this.cmd.Connection.Query(text, null, null, true, null, null);
				if (enumerable.Count<ThoiGianThietLap>() > 0)
				{
					thoiGianThietLap = enumerable.First<ThoiGianThietLap>();
				}
				else
				{
					thoiGianThietLap = null;
				}
			}
			catch (Exception)
			{
				thoiGianThietLap = null;
			}
			return thoiGianThietLap;
		}

		// Token: 0x06000555 RID: 1365 RVA: 0x0001D170 File Offset: 0x0001B370
		public void UpDateThoiGianThietLap(ThoiGianThietLap item)
		{
			try
			{
				this.cmd.Connection.UpdateAsync(item, null, null);
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000556 RID: 1366 RVA: 0x0001D1B0 File Offset: 0x0001B3B0
		public void UpDateBookDadoc(string userName, long dataId)
		{
			try
			{
				string text = string.Format("Update Books set Dadoc=1 where UserName='{0}' and BookId={1}", userName, dataId);
				this.cmd.Connection.Execute(text, null, null, null, null);
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000557 RID: 1367 RVA: 0x0001D20C File Offset: 0x0001B40C
		public void InsertThongBao(List<MessagesDto> items)
		{
			try
			{
				foreach (MessagesDto messagesDto in items)
				{
					string text = string.Format("SELECT Count(ID) from ThongBao b  where  b.ID = {0}", messagesDto.ID);
					if (this.cmd.Connection.QueryFirst(text, null, null, null, null) == 0)
					{
						this.cmd.Connection.Insert(messagesDto, null, null);
					}
				}
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000558 RID: 1368 RVA: 0x0001D2C0 File Offset: 0x0001B4C0
		public void UpdateThongBao(List<MessagesDto> item)
		{
			try
			{
				this.cmd.Connection.UpdateAsync(item, null, null);
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x06000559 RID: 1369 RVA: 0x0001D300 File Offset: 0x0001B500
		public void SachDaDoc(string userName, long productId)
		{
			try
			{
				string text = string.Format("Update Books set IsReading=0 where UserName='{0}';", userName);
				this.cmd.Connection.Execute(text, null, null, null, null);
				text = string.Format("Update Books set IsReading=1 where UserName='{0}' and BookId={1};", userName, productId);
				this.cmd.Connection.Execute(text, null, null, null, null);
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600055A RID: 1370 RVA: 0x0001D38C File Offset: 0x0001B58C
		public void UpdateBook(Book book)
		{
			try
			{
				string text = string.Format("Update Books set DaThietLapThoiGian=true where BookId={0} and LibraryId={1};", book.BookId, book.LibraryId);
				this.cmd.Connection.Execute(text, null, null, null, null);
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x040002EE RID: 750
		private static DBSqlite instance;

		// Token: 0x040002EF RID: 751
		public SQLiteConnection conn;

		// Token: 0x040002F0 RID: 752
		private SQLiteCommand cmd;

		// Token: 0x040002F1 RID: 753
		public static string DB_PATH = Common.FOLDER_DOWNLOAD + "\\DHQG07.sqlite";

		// Token: 0x040002F2 RID: 754
		public static string connectionString = "Data Source =" + Common.FOLDER_DOWNLOAD + "\\DHQG07.sqlite;Version=3;MultipleActiveResultSets=true";

		// Token: 0x040002F3 RID: 755
		private string strCreateLibraryDB = "create table if not exists [Libraries](ID INTEGER PRIMARY KEY NOT NULL,                                 'Name' TEXT NOT NULL,                                 'Domain' TEXT NOT NULL,                                 'DonViID' INTEGER NOT NULL,'isChoosed' INTEGER)";

		// Token: 0x040002F4 RID: 756
		private string strCreateCategoryDB = "create table if not exists [Categories]('CategoryId' INTEGER PRIMARY KEY NOT NULL,'CategoryName' TEXT NOT NULL, CategoryOrder INTEGER,'ParentId' INTEGER NOT NULL)";

		// Token: 0x040002F5 RID: 757
		private string strCreateBookDB = "create table if not exists [Books]('BookId' INTEGER NOT NULL,'BookName' TEXT NOT NULL,Dadoc INTERGER,'BookCode' TEXT NOT NULL,'BookCover' TEXT   NOT NULL,'Author' TEXT,'NhaXuatBan' TEXT,'NamXuatBan' TEXT, 'LibraryId' INTEGER NOT NULL, 'LibraryDomain' TEXT NOT NULL, 'LibraryName' TEXT NOT NULL, 'UserName' TEXT NOT NULL,  'DonViID' INTEGER NOT NULL,'DaThietLapThoiGian' boolean Not Null default false, 'RemainDate' REAL, 'IsReading' BOOLEAN, 'GetDataDate' TEXT, 'UserPassword' TEXT,'IsDownload' BOOLEAN DEFAULT false,positionRead INTEGER NOT NULL Default 0,  PRIMARY KEY(BookId, UserName, LibraryId))";

		// Token: 0x040002F6 RID: 758
		private string strCreateNote = "create table if not exists [Notes] ('ID' INTEGER PRIMARY KEY AUTOINCREMENT,'BookID' TEXT, 'PageNumber' TEXT, 'NoteText' TEXT, 'X' INTEGER, 'Y' INTEGER, 'Mode' INTEGER)";

		// Token: 0x040002F7 RID: 759
		private string strCreateUser = "create table if not exists [Account] ('UserID' INTEGER, 'UserName' TEXT, 'Token' TEXT, 'LibraryID' INTEGER, 'UserPassword' TEXT, 'KeepLoggedIn' INTEGER,'FullName' Text, 'Email' Text, 'Mobile' Text,'AllowUpload' Integer,   PRIMARY KEY (UserID, LibraryID) )";

		// Token: 0x040002F8 RID: 760
		private string strCreateBookmark = "create table if not exists [BookMark] ('BookMarkID' INTEGER PRIMARY KEY AUTOINCREMENT,                                               'BookCode' TEXT, 'PageNumber' INTEGER  )";

		// Token: 0x040002F9 RID: 761
		private string strCreateBookUrl = "CREATE TABLE BookUrl (CheckSum TEXT(100),DataID INTEGER NOT NULL, FileSize INTEGER, FileTitle TEXT, 'Position' INTEGER, 'Type' TEXT, Forder TEXT,HaveZip INTEGER,secondRead INTEGER NOT NULL Default 0);";

		// Token: 0x040002FA RID: 762
		private string strThoiGianDoc = "CREATE TABLE `ThoiGianDoc` (`Id` INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, `UserId` INTEGER,`DataId` INTEGER, BatDau Datetime,KetThuc Datetime,ThoiGian Decimal,DaUpdate boolean default false, LibId Integer);";

		// Token: 0x040002FB RID: 763
		private string strThongBao = "CREATE TABLE `ThongBao` (`Id` INTEGER NOT NULL, Content Text,Link Text,EdataID Integer,CreatedDate Datetime, name Text,Portrait text,EdataName Text,Type Text,EdataCoverPic text);";

		// Token: 0x040002FC RID: 764
		private string strCreateBookDocDuDinhDB = "create table if not exists [BookThoiGianDuDinh]('BookId' INTEGER NOT NULL,'UserId' INTEGER NOT NULL,'Code' TEXT NOT NULL,CreatedDate Datetime,'ModifiedDate' Datetime,'TimeFinish' INTERGER, LibId INTERGER, PRIMARY KEY(BookId,LibId,UserId))";

		// Token: 0x040002FD RID: 765
		private string strCreateOptionDB = "create table if not exists [Option]('Id' Text not null,'Value' Text, PRIMARY KEY(Id))";
	}
}
