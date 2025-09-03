using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Drawing;
using System.Drawing.Imaging;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Cache;
using System.Reflection;
using System.Speech.Synthesis;
using System.Text;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using Bookworm.AppCode;
using Bookworm.Properties;
using Bookworm.Sqlite;
using Bookworm.UserControls;
using CustomEntity;
using CustomEntity.Model;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;

namespace Bookworm.Utils
{
	// Token: 0x0200001E RID: 30
	public static class UtilContants
	{
		// Token: 0x060001D4 RID: 468 RVA: 0x000074CC File Offset: 0x000056CC
		public static List<T> GetLogicalChildCollection<T>(object parent) where T : DependencyObject
		{
			List<T> list = new List<T>();
			UtilContants.GetLogicalChildCollection<T>(parent as DependencyObject, list);
			return list;
		}

		// Token: 0x060001D5 RID: 469 RVA: 0x000074EC File Offset: 0x000056EC
		private static void GetLogicalChildCollection<T>(DependencyObject parent, List<T> logicalCollection) where T : DependencyObject
		{
			foreach (object obj in LogicalTreeHelper.GetChildren(parent))
			{
				if (obj is DependencyObject)
				{
					DependencyObject dependencyObject = obj as DependencyObject;
					if (obj is T)
					{
						logicalCollection.Add(obj as T);
					}
					UtilContants.GetLogicalChildCollection<T>(dependencyObject, logicalCollection);
				}
			}
		}

		// Token: 0x060001D6 RID: 470 RVA: 0x00007568 File Offset: 0x00005768
		public static int GetLastViewPage(string FilePath)
		{
			int num;
			try
			{
				string fullName = Directory.GetParent(FilePath).FullName;
				string text = fullName + "\\userdata";
				if (!Directory.Exists(fullName + "\\userdata") || !File.Exists(text + "\\lastpageview"))
				{
					num = 0;
				}
				else
				{
					num = Convert.ToInt32(File.ReadAllText(text + "\\lastpageview").Trim());
				}
			}
			catch
			{
				num = 0;
			}
			return num;
		}

		// Token: 0x060001D7 RID: 471 RVA: 0x000075E8 File Offset: 0x000057E8
		public static BitmapImage BitmapToImageSource(Bitmap bitmap)
		{
			BitmapImage bitmapImage2;
			using (MemoryStream memoryStream = new MemoryStream())
			{
				bitmap.Save(memoryStream, ImageFormat.Bmp);
				memoryStream.Position = 0L;
				BitmapImage bitmapImage = new BitmapImage();
				bitmapImage.BeginInit();
				bitmapImage.StreamSource = memoryStream;
				bitmapImage.CacheOption = BitmapCacheOption.OnLoad;
				bitmapImage.EndInit();
				bitmapImage2 = bitmapImage;
			}
			return bitmapImage2;
		}

		// Token: 0x060001D8 RID: 472 RVA: 0x0000764C File Offset: 0x0000584C
		public static int GetCoordinateInPage(double num, double ratio)
		{
			return (int)Math.Ceiling(num * ratio / 1000.0);
		}

		// Token: 0x060001D9 RID: 473 RVA: 0x00007661 File Offset: 0x00005861
		public static void Play(string words, SpeechSynthesizer speaker)
		{
			speaker = new SpeechSynthesizer();
			speaker.Rate = 2;
			speaker.SelectVoice(speaker.GetInstalledVoices().FirstOrDefault<InstalledVoice>().VoiceInfo.Name);
			speaker.SpeakAsync(words);
		}

		// Token: 0x060001DA RID: 474 RVA: 0x00007694 File Offset: 0x00005894
		public static void CreateAndSetPermissionFolder()
		{
			AppUtils.setFullPermision(Directory.GetCurrentDirectory(), "Users");
			AppUtils.setFullPermision(Directory.GetCurrentDirectory(), "Everyone");
			if (!Directory.Exists(Common.FOLDER_TEMP))
			{
				Settings.Default.Reset();
				Directory.CreateDirectory(Common.FOLDER_TEMP);
				AppUtils.setFullPermision(Common.FOLDER_TEMP, "Users");
				AppUtils.setFullPermision(Common.FOLDER_TEMP, "Everyone");
			}
			if (!Directory.Exists(Common.FOLDER_DOWNLOAD))
			{
				Directory.CreateDirectory(Common.FOLDER_DOWNLOAD);
				AppUtils.setFullPermision(Common.FOLDER_DOWNLOAD, "Users");
				AppUtils.setFullPermision(Common.FOLDER_DOWNLOAD, "Everyone");
			}
			if (!Directory.Exists(Common.FOLDER_DOWLOAD_PRODUCT))
			{
				Directory.CreateDirectory(Common.FOLDER_DOWLOAD_PRODUCT);
				AppUtils.setFullPermision(Common.FOLDER_DOWLOAD_PRODUCT, "Users");
				AppUtils.setFullPermision(Common.FOLDER_DOWLOAD_PRODUCT, "Everyone");
			}
			if (!Directory.Exists(Common.FOLDER_UNZIP))
			{
				Directory.CreateDirectory(Common.FOLDER_UNZIP);
				AppUtils.setFullPermision(Common.FOLDER_UNZIP, "Users");
				AppUtils.setFullPermision(Common.FOLDER_UNZIP, "Everyone");
			}
			if (!Directory.Exists(Common.FOLDER_TEMP_READER))
			{
				Directory.CreateDirectory(Common.FOLDER_TEMP_READER);
				AppUtils.setFullPermision(Common.FOLDER_TEMP_READER, "Users");
				AppUtils.setFullPermision(Common.FOLDER_TEMP_READER, "Everyone");
			}
			if (!Directory.Exists(Common.FOLDER_ERR_LOG))
			{
				Directory.CreateDirectory(Common.FOLDER_ERR_LOG);
				AppUtils.setFullPermision(Common.FOLDER_ERR_LOG, "Users");
				AppUtils.setFullPermision(Common.FOLDER_ERR_LOG, "Everyone");
			}
			if (!Directory.Exists("C:\\ProgramData\\HoclienApp\\CBTemp"))
			{
				Directory.CreateDirectory("C:\\ProgramData\\HoclienApp\\CBTemp");
				AppUtils.setFullPermision("C:\\ProgramData\\HoclienApp\\CBTemp", "Users");
				AppUtils.setFullPermision("C:\\ProgramData\\HoclienApp\\CBTemp", "Everyone");
				AppUtils.setHiddenFolder("C:\\ProgramData\\HoclienApp\\CBTemp", true);
			}
			File.WriteAllText("C:\\ProgramData\\HoclienApp\\CBTemp\\uuid.dat", AppUtils.getUniqueKey());
			if (!File.Exists("C:\\ProgramData\\HoclienApp\\CBTemp\\cbauuid.log"))
			{
				try
				{
					if (!Directory.Exists("C:\\ProgramData\\Bookworm\\CBTemp"))
					{
						Directory.CreateDirectory("C:\\ProgramData\\Bookworm\\CBTemp");
						AppUtils.setFullPermision(Common.FOLDER_TEMP, "Users");
						AppUtils.setFullPermision(Common.FOLDER_TEMP, "Everyone");
						AppUtils.setHiddenFolder("C:\\ProgramData\\Bookworm\\CBTemp", true);
					}
					string csproductUUID = AppUtils.getCSProductUUID();
					File.AppendAllText("C:\\ProgramData\\HoclienApp\\CBTemp\\cbauuid.log", csproductUUID);
					AppUtils.setHiddenFile("C:\\ProgramData\\HoclienApp\\CBTemp\\cbauuid.log", true);
				}
				catch
				{
					MessageBox.Show("Windows của bạn không tương thích với tính năng đọc sách eReader", "Thông báo");
				}
			}
		}

		// Token: 0x060001DB RID: 475 RVA: 0x000078E4 File Offset: 0x00005AE4
		public static T GetDataFromServices<T>(string url, Common.RequestMethod method = Common.RequestMethod.GET, string dataJson = "")
		{
			T t;
			try
			{
				string text = string.Empty;
				url = url.Replace("/ ", "/").Replace(" /", "");
				if (method == Common.RequestMethod.GET)
				{
					text = UtilContants.GetJSONString(url);
				}
				else if (method == Common.RequestMethod.POST)
				{
					text = UtilContants.PostJSONString(url, dataJson);
				}
				t = JsonConvert.DeserializeObject<T>(UtilContants.ProcessJSONString(text), new JsonConverter[]
				{
					new IsoDateTimeConverter
					{
						DateTimeFormat = "dd/MM/yyyy"
					}
				});
			}
			catch (Exception)
			{
				t = default(T);
			}
			return t;
		}

		// Token: 0x060001DC RID: 476 RVA: 0x00007978 File Offset: 0x00005B78
		public static void PostToServices(string url, string json)
		{
			try
			{
				HttpWebRequest httpWebRequest = (HttpWebRequest)WebRequest.Create(url);
				httpWebRequest.ContentType = "application/json";
				httpWebRequest.Method = "POST";
				using (StreamWriter streamWriter = new StreamWriter(httpWebRequest.GetRequestStream()))
				{
					streamWriter.Write(json);
				}
				HttpWebResponse httpWebResponse = (HttpWebResponse)httpWebRequest.GetResponse();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x060001DD RID: 477 RVA: 0x000079F4 File Offset: 0x00005BF4
		private static string PostJSONString(string url, string dataJson)
		{
			HttpWebRequest httpWebRequest = (HttpWebRequest)WebRequest.Create(url);
			HttpRequestCachePolicy httpRequestCachePolicy = new HttpRequestCachePolicy(HttpRequestCacheLevel.NoCacheNoStore);
			httpWebRequest.CachePolicy = httpRequestCachePolicy;
			httpWebRequest.Timeout = 100000;
			httpWebRequest.ReadWriteTimeout = 100000;
			httpWebRequest.Method = "POST";
			httpWebRequest.ContentType = "application/json";
			string text;
			try
			{
				using (StreamWriter streamWriter = new StreamWriter(httpWebRequest.GetRequestStream()))
				{
					streamWriter.Write(dataJson);
				}
				using (HttpWebResponse httpWebResponse = (HttpWebResponse)httpWebRequest.GetResponse())
				{
					using (StreamReader streamReader = new StreamReader(httpWebResponse.GetResponseStream()))
					{
						text = streamReader.ReadToEnd();
					}
				}
			}
			catch (Exception)
			{
				text = string.Empty;
			}
			return text;
		}

		// Token: 0x060001DE RID: 478 RVA: 0x00007AE0 File Offset: 0x00005CE0
		public static string GetJSONString(string url)
		{
			HttpRequestCachePolicy httpRequestCachePolicy = new HttpRequestCachePolicy(HttpRequestCacheLevel.NoCacheNoStore);
			HttpWebRequest httpWebRequest = (HttpWebRequest)WebRequest.Create(url);
			httpWebRequest.CachePolicy = httpRequestCachePolicy;
			httpWebRequest.Timeout = 10000;
			httpWebRequest.ReadWriteTimeout = 10000;
			httpWebRequest.Proxy = null;
			string text;
			try
			{
				using (HttpWebResponse httpWebResponse = (HttpWebResponse)httpWebRequest.GetResponse())
				{
					using (BufferedStream bufferedStream = new BufferedStream(httpWebResponse.GetResponseStream()))
					{
						using (StreamReader streamReader = new StreamReader(bufferedStream, Encoding.UTF8))
						{
							text = streamReader.ReadToEnd();
						}
					}
				}
			}
			catch (Exception)
			{
				text = string.Empty;
			}
			return text;
		}

		// Token: 0x060001DF RID: 479 RVA: 0x00007BB4 File Offset: 0x00005DB4
		private static string ProcessJSONString(string json)
		{
			if (!json.Contains("creator_name"))
			{
				return json;
			}
			string text = string.Empty;
			string[] array = json.Split(new string[] { "creator_name" }, StringSplitOptions.RemoveEmptyEntries);
			for (int i = 0; i < array.Count<string>(); i++)
			{
				string text2 = string.Empty;
				string text3 = string.Empty;
				if (i > 0)
				{
					text2 = "creator_name" + array[i];
				}
				else
				{
					text2 = array[i];
				}
				if (text2.StartsWith("creator_name\": ["))
				{
					int length = text2.Substring(0, text2.IndexOf("]")).Length;
					string text4 = text2.Substring(16, text2.IndexOf("]") - 16);
					text4 = "\": " + text4.Replace("\", \"", "&split;");
					text3 = "creator_name" + text4 + text2.Substring(length + 1, text2.Length - length - 1);
					text2 = string.Empty;
				}
				text = text + text2 + text3;
			}
			return text;
		}

		// Token: 0x060001E0 RID: 480 RVA: 0x00007CB8 File Offset: 0x00005EB8
		public static void LogError(string TAG, string message, bool isshowWarning = true)
		{
			string text = "log-" + DateTime.Now.ToString("yyyy-MM-dd");
			string text2 = Common.FOLDER_ERR_LOG + text;
			string text3 = string.Concat(new string[]
			{
				DateTime.Now.ToString("yyyy/MM/dd/ hh:mm:ss"),
				" - ",
				TAG,
				": ",
				message
			});
			if (File.Exists(text2))
			{
				using (StreamWriter streamWriter = new StreamWriter(text2, true))
				{
					streamWriter.WriteLine(text3);
					return;
				}
			}
			StreamWriter streamWriter2 = File.CreateText(text2);
			streamWriter2.WriteLine(text3);
			streamWriter2.Close();
		}

		// Token: 0x060001E1 RID: 481 RVA: 0x00007D70 File Offset: 0x00005F70
		public static T GetItem<T>(DataRow row)
		{
			Type typeFromHandle = typeof(T);
			T t = Activator.CreateInstance<T>();
			foreach (object obj in row.Table.Columns)
			{
				DataColumn dataColumn = (DataColumn)obj;
				foreach (PropertyInfo propertyInfo in typeFromHandle.GetProperties())
				{
					if (propertyInfo.Name == dataColumn.ColumnName)
					{
						propertyInfo.SetValue(t, row[dataColumn.ColumnName], null);
						break;
					}
				}
			}
			return t;
		}

		// Token: 0x060001E2 RID: 482 RVA: 0x00007E30 File Offset: 0x00006030
		public static List<T> ConvertDataTableToList<T>(DataTable dataTable)
		{
			List<T> list = new List<T>();
			try
			{
				foreach (object obj in dataTable.Rows)
				{
					T item = UtilContants.GetItem<T>((DataRow)obj);
					list.Add(item);
				}
			}
			catch (Exception ex)
			{
				throw ex;
			}
			return list;
		}

		// Token: 0x060001E3 RID: 483 RVA: 0x00007EA4 File Offset: 0x000060A4
		public static ImageSource CreateImageSource(string file)
		{
			BitmapImage bitmapImage = new BitmapImage();
			bitmapImage.BeginInit();
			if (!string.IsNullOrEmpty(file))
			{
				bitmapImage.UriSource = new Uri(file, UriKind.Absolute);
				bitmapImage.CreateOptions = BitmapCreateOptions.IgnoreImageCache;
			}
			bitmapImage.EndInit();
			return bitmapImage;
		}

		// Token: 0x060001E4 RID: 484 RVA: 0x00007EE0 File Offset: 0x000060E0
		public static bool CheckForInternetConnection()
		{
			return true;
		}

		// Token: 0x060001E5 RID: 485 RVA: 0x00007EE4 File Offset: 0x000060E4
		public static global::System.Windows.Media.Color ChangeColorBrightness(global::System.Windows.Media.Color color, float correctionFactor)
		{
			float num = (float)color.R;
			float num2 = (float)color.G;
			float num3 = (float)color.B;
			if (correctionFactor < 0f)
			{
				correctionFactor = 1f + correctionFactor;
				num *= correctionFactor;
				num2 *= correctionFactor;
				num3 *= correctionFactor;
			}
			else
			{
				num = (255f - num) * correctionFactor + num;
				num2 = (255f - num2) * correctionFactor + num2;
				num3 = (255f - num3) * correctionFactor + num3;
			}
			return global::System.Windows.Media.Color.FromArgb(color.A, (byte)num, (byte)num2, (byte)num3);
		}

		// Token: 0x060001E6 RID: 486 RVA: 0x00007F64 File Offset: 0x00006164
		public static void DeleteDirectory(string target_dir)
		{
			string[] files = Directory.GetFiles(target_dir);
			string[] directories = Directory.GetDirectories(target_dir);
			foreach (string text in files)
			{
				File.SetAttributes(text, FileAttributes.Normal);
				File.Delete(text);
			}
			string[] array = directories;
			for (int i = 0; i < array.Length; i++)
			{
				UtilContants.DeleteDirectory(array[i]);
			}
			Directory.Delete(target_dir, false);
		}

		// Token: 0x060001E7 RID: 487 RVA: 0x00007FC0 File Offset: 0x000061C0
		public static bool ShowMessage(string message, string btnOkTitle, string btnCancelTitle)
		{
			ucMessageBox ucMessageBox = new ucMessageBox(message, btnOkTitle, btnCancelTitle);
			ucMessageBox.ShowDialog();
			return ucMessageBox.DialogResult.Value;
		}

		// Token: 0x060001E8 RID: 488 RVA: 0x00007FEC File Offset: 0x000061EC
		public static string ReloginUser(string userName = null, string password = null)
		{
			AccountResult dataFromServices = UtilContants.GetDataFromServices<AccountResult>(string.Format("{0}{1}{2}/{3}", new object[]
			{
				MainApp.currentLibrary.Domain,
				"/loginrs/",
				string.IsNullOrEmpty(userName) ? MainApp.LoggedUserName : userName,
				string.IsNullOrEmpty(password) ? MainApp.UserPassword : password
			}), Common.RequestMethod.GET, "");
			string text;
			if (!dataFromServices.Account.Message.VMCode.Equals("LG01"))
			{
				text = dataFromServices.Account.Message.MessageContent;
			}
			else
			{
				DBSqlite.Instance.UpdateUserToken(dataFromServices.Account.UserID, dataFromServices.Account.Token);
				MainApp.LoggedUserToken = dataFromServices.Account.Token;
				text = dataFromServices.Account.Message.VMCode;
			}
			return text;
		}

		// Token: 0x060001E9 RID: 489 RVA: 0x000080C4 File Offset: 0x000062C4
		public static void SaveImage(string saveFilePath, string imgUrl)
		{
			try
			{
				WebResponse response = ((HttpWebRequest)WebRequest.Create(imgUrl)).GetResponse();
				Stream responseStream = response.GetResponseStream();
				byte[] array;
				using (BinaryReader binaryReader = new BinaryReader(responseStream))
				{
					array = binaryReader.ReadBytes(500000);
					binaryReader.Close();
				}
				responseStream.Close();
				response.Close();
				FileStream fileStream = new FileStream(saveFilePath, FileMode.Create);
				BinaryWriter binaryWriter = new BinaryWriter(fileStream);
				try
				{
					binaryWriter.Write(array);
				}
				finally
				{
					fileStream.Close();
					binaryWriter.Close();
				}
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x060001EA RID: 490 RVA: 0x00008174 File Offset: 0x00006374
		public static void setCurrentLibrary(MainApp mainApp, Library lib)
		{
			MainApp.currentLibrary = lib;
			Settings.Default.LoggedLibrary = lib;
			Settings.Default.Save();
			mainApp.ucHeader.txtLibName.Text = lib.Name;
			mainApp.ucHeader.UCBookShelf = null;
			mainApp.ucHeader.UCListBook = null;
			Account account = DBSqlite.Instance.SelectAccountByLibraryID(lib.ID);
			if (account == null)
			{
				MainApp.LoggedUserID = 0L;
				MainApp.LoggedUserName = string.Empty;
				MainApp.LoggedUserToken = string.Empty;
				MainApp.UserPassword = string.Empty;
				MainApp.IsKeepLoggedIn = false;
				return;
			}
			MainApp.LoggedUserID = account.UserID;
			MainApp.LoggedUserName = account.UserName;
			MainApp.LoggedUserToken = account.Token;
			MainApp.UserPassword = account.UserPassword;
			MainApp.IsKeepLoggedIn = account.KeepLoggedIn != 0L;
		}

		// Token: 0x060001EB RID: 491 RVA: 0x00008248 File Offset: 0x00006448
		private static string SaveImageLogo(string url)
		{
			string text = string.Empty;
			if (!string.IsNullOrEmpty(url))
			{
				string folder_IMAGE_LOGO = Common.FOLDER_IMAGE_LOGO;
				if (!Directory.Exists(folder_IMAGE_LOGO))
				{
					Directory.CreateDirectory(folder_IMAGE_LOGO);
				}
				string text2 = folder_IMAGE_LOGO + ("logo" + Guid.NewGuid().ToString()) + ".jpg";
				try
				{
					WebClient webClient = new WebClient();
					if (!File.Exists(text2))
					{
						webClient.DownloadFile(url, text2);
					}
					text = text2;
				}
				catch (Exception)
				{
				}
			}
			return text;
		}

		// Token: 0x060001EC RID: 492 RVA: 0x000082D4 File Offset: 0x000064D4
		public static void GetThemeLibrary(MainApp mainApp, Library library)
		{
			try
			{
				GetThemesServiceResult dataFromServices = UtilContants.GetDataFromServices<GetThemesServiceResult>(string.Format("{0}{1}9/{2}", new object[] { library.Domain, "/cbs/GetThemes/", "false" }), Common.RequestMethod.GET, "");
				Theme theme = new Theme();
				if (dataFromServices == null || dataFromServices.Theme == null || dataFromServices.Theme.Count <= 0)
				{
					theme = new Theme
					{
						HomeToolBarBackgroundColor = "#01A471",
						LogoImage = "/images/logoDefault.png",
						ToolBarForeground = "#565656",
						ToolBarForegroundIcon = 1
					};
					mainApp.ScrollbarForeground = "#01A471";
				}
				else
				{
					theme = dataFromServices.Theme[0];
					string text = UtilContants.SaveImageLogo(theme.LogoImage);
					theme.LogoImage = text;
					theme.ToolBarForeground = "#FFFFFF";
					theme.ToolBarForegroundIcon = 1;
					mainApp.ScrollbarForeground = theme.HomeToolBarBackgroundColor;
				}
				mainApp.ucHeader.LibraryTheme = theme;
				Settings.Default.CurrentTheme = theme;
				Settings.Default.Save();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x060001ED RID: 493 RVA: 0x000083EC File Offset: 0x000065EC
		public static GetBanner GetThemeLibraryLic(MainApp mainApp, Library library)
		{
			GetBanner getBanner;
			try
			{
				getBanner = UtilContants.GetDataFromServices<GetBanner>(string.Format("{0}{1}", new object[] { library.Domain, "/cbs/Themes/getbannerwindows" }), Common.RequestMethod.GET, "");
			}
			catch (Exception)
			{
				getBanner = null;
			}
			return getBanner;
		}

		// Token: 0x060001EE RID: 494 RVA: 0x00008440 File Offset: 0x00006640
		public static void setCurrentReadingBook(MainApp mainApp, Book book)
		{
			Settings.Default.ReadingBook = book;
			Settings.Default.Save();
			mainApp.ucHeader.ReadingBook = book;
		}

		// Token: 0x060001EF RID: 495 RVA: 0x00008464 File Offset: 0x00006664
		public static T SearchVisualTree<T>(Visual vis) where T : Visual
		{
			if (vis == null)
			{
				return default(T);
			}
			IEnumerable<int> enumerable = Enumerable.Range(0, VisualTreeHelper.GetChildrenCount(vis));
			return (from i in enumerable
				let child = VisualTreeHelper.GetChild(vis, i) as T
				where child != null
				select child).Concat(from j in enumerable
				let descendant = UtilContants.SearchVisualTree<T>(VisualTreeHelper.GetChild(vis, j) as Visual)
				where descendant != null
				select descendant).FirstOrDefault<T>();
		}

		// Token: 0x060001F0 RID: 496 RVA: 0x00008560 File Offset: 0x00006760
		public static void LuuThoiGianDoc()
		{
			if (BienChung.Instance.thoiGianDoc != null)
			{
				if (BienChung.Instance.thoiGianDoc.ThoiGian > 0.0)
				{
					BienChung.Instance.thoiGianDoc.UserId = MainApp.LoggedUserID;
					DBSqlite.Instance.InsertThoiGianDoc(BienChung.Instance.thoiGianDoc);
					DBSqlite.Instance.UpDateBookDadoc(MainApp.LoggedUserName, BienChung.Instance.DataID);
				}
				BienChung.Instance.thoiGianDoc = new ThoiGianDoc();
			}
		}

		// Token: 0x060001F1 RID: 497 RVA: 0x000085E4 File Offset: 0x000067E4
		public static T FindParent<T>(FrameworkElement child) where T : DependencyObject
		{
			T t = default(T);
			for (DependencyObject dependencyObject = VisualTreeHelper.GetParent(child); dependencyObject != null; dependencyObject = VisualTreeHelper.GetParent(dependencyObject))
			{
				if (dependencyObject is T)
				{
					t = (T)((object)dependencyObject);
					break;
				}
			}
			return t;
		}

		// Token: 0x060001F2 RID: 498 RVA: 0x00008620 File Offset: 0x00006820
		public static string LayThongTinPhienBan()
		{
			string text = "";
			try
			{
				text = ConfigurationManager.AppSettings["PhienBan"].ToString();
			}
			catch (Exception)
			{
			}
			return text;
		}

		// Token: 0x060001F3 RID: 499 RVA: 0x00008660 File Offset: 0x00006860
		public static Version RegDwordIntegerVersionParse(string input)
		{
			string empty = string.Empty;
			string text = string.Empty;
			string text2 = string.Empty;
			Version version;
			try
			{
				string text3 = long.Parse(input).ToString("X8");
				if (!string.IsNullOrEmpty(text3) && text3.Length >= 5)
				{
					string text4 = text3.Substring(0, 2);
					text = text3.Substring(2, 2);
					text2 = text3.Substring(4, text3.Length - 4);
					int num = int.Parse(text4, NumberStyles.HexNumber);
					int num2 = int.Parse(text, NumberStyles.HexNumber);
					int num3 = int.Parse(text2, NumberStyles.HexNumber);
					version = new Version(num, num2, num3);
				}
				else
				{
					version = new Version();
				}
			}
			catch
			{
				version = new Version();
			}
			return version;
		}
	}
}
