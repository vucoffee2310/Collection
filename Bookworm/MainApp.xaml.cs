using System;
using System.CodeDom.Compiler;
using System.Collections.Generic;
using System.ComponentModel;
using System.Configuration;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Markup;
using Bookworm.Properties;
using Bookworm.Sqlite;
using Bookworm.UserControls;
using Bookworm.UserControls.Book;
using Bookworm.UserControls.Library;
using Bookworm.UserControls.ListBookByLib;
using Bookworm.UserControls.ListBookByLib.PopUp;
using Bookworm.Utils;
using CustomEntity;
using CustomEntity.Model;
using Newtonsoft.Json;

namespace Bookworm
{
	// Token: 0x02000019 RID: 25
	public partial class MainApp : Window, INotifyPropertyChanged
	{
		// Token: 0x14000001 RID: 1
		// (add) Token: 0x06000121 RID: 289 RVA: 0x00004094 File Offset: 0x00002294
		// (remove) Token: 0x06000122 RID: 290 RVA: 0x000040CC File Offset: 0x000022CC
		public event EventHandler closeUcreader;

		// Token: 0x14000002 RID: 2
		// (add) Token: 0x06000123 RID: 291 RVA: 0x00004104 File Offset: 0x00002304
		// (remove) Token: 0x06000124 RID: 292 RVA: 0x0000413C File Offset: 0x0000233C
		public event EventHandler closeWindow;

		// Token: 0x06000125 RID: 293 RVA: 0x00004171 File Offset: 0x00002371
		public void closeReadingBook(object sender, EventArgs e)
		{
			if (this.closeUcreader != null)
			{
				this.closeUcreader(this, e);
			}
		}

		// Token: 0x17000074 RID: 116
		// (get) Token: 0x06000126 RID: 294 RVA: 0x00004188 File Offset: 0x00002388
		// (set) Token: 0x06000127 RID: 295 RVA: 0x00004190 File Offset: 0x00002390
		public string ScrollbarForeground
		{
			get
			{
				return this._scrollbarForeground;
			}
			set
			{
				this._scrollbarForeground = value;
				this.OnPropertyChanged("ScrollbarForeground");
			}
		}

		// Token: 0x06000128 RID: 296 RVA: 0x000041A4 File Offset: 0x000023A4
		public MainApp()
		{
			try
			{
				UtilContants.CreateAndSetPermissionFolder();
				this.InitializeComponent();
				if (File.Exists("C:\\ProgramData\\Bookworm\\HaveCS.txt"))
				{
					base.Activated += delegate(object s, EventArgs e)
					{
						this.ucHeader.HienThiFormDangnhapLanDau();
					};
					this.InitChinh();
				}
				else
				{
					this.Chinh.Visibility = Visibility.Collapsed;
					this.ChinhSach.Visibility = Visibility.Visible;
					string dataFromServices = UtilContants.GetDataFromServices<string>(ConfigurationManager.AppSettings["ChinhSach"], Common.RequestMethod.GET, "");
					this.wbSample.Navigate(dataFromServices);
				}
			}
			catch (Exception ex)
			{
				UtilContants.LogError("AppChinh", ex.Message, true);
			}
		}

		// Token: 0x06000129 RID: 297 RVA: 0x00004250 File Offset: 0x00002450
		public void InitChinh()
		{
			base.Closed += this.DongApp;
			base.DataContext = this;
			this.ucHeader.MainApp = this;
			try
			{
				this.Init();
				this.ShowData();
				this.resetHeader();
				this.LuuThoiGianDocLenServer();
				this.checkVersion();
			}
			catch (Exception)
			{
			}
		}

		// Token: 0x0600012A RID: 298 RVA: 0x000042B8 File Offset: 0x000024B8
		public void HienThiFormDangNhap()
		{
			this.loginForm = new ucLoginForm(this);
			this.ProcessingDialog.ShowHandlerDialog();
			if (this.loginForm.ShowDialog().Value)
			{
				this.InitChinh();
			}
		}

		// Token: 0x0600012B RID: 299 RVA: 0x000042F8 File Offset: 0x000024F8
		public async Task checkVersion()
		{
			await Task.Run(delegate
			{
				MessagePhienBan dataFromServices = UtilContants.GetDataFromServices<MessagePhienBan>(string.Format("{0}/{1}", new object[]
				{
					MainApp.currentLibrary.Domain,
					"cbs/products/getversionapp/windows "
				}), Common.RequestMethod.GET, "");
				string text = UtilContants.LayThongTinPhienBan();
				if (dataFromServices.Status && text != dataFromServices.Result)
				{
					base.Dispatcher.Invoke(delegate
					{
						if (MessageBox.Show("Hãy cập nhật phiên bản mới nhất", "", MessageBoxButton.YesNo) == MessageBoxResult.Yes)
						{
							Process.Start(ConfigurationManager.AppSettings["LinkTai"]);
						}
					});
				}
			});
		}

		// Token: 0x0600012C RID: 300 RVA: 0x0000433B File Offset: 0x0000253B
		public void resetHeader()
		{
			this.ucHeader.change();
		}

		// Token: 0x0600012D RID: 301 RVA: 0x00004348 File Offset: 0x00002548
		public void Init()
		{
			Library library = new Library
			{
				Active = true,
				Domain = ConfigurationManager.AppSettings["Domain"],
				DonViID = 1L,
				ID = 1L,
				Name = "Trung tâm TT - TV Đại học Quốc gia Hà Nội"
			};
			if (library != null)
			{
				UtilContants.setCurrentLibrary(this, library);
				Account account = DBSqlite.Instance.SelectAccountByLibraryID(library.ID);
				if (account != null)
				{
					BienChung.Instance.user = account;
					MainApp.LoggedUserID = account.UserID;
					MainApp.LoggedUserName = account.UserName;
					MainApp.LoggedFullName = account.FullName;
					MainApp.LoggedUserToken = account.Token;
					MainApp.UserPassword = account.UserPassword;
					MainApp.AllowUpload = account.AllowUpload;
					this.ucHeader.HienThi();
					MainApp.IsKeepLoggedIn = account.KeepLoggedIn != 0L;
				}
			}
			this.LuuThoiGianDocLenServer();
			this.ucHeader.ConfigControlLogin();
			this.ucHeader.LibraryTheme = new Theme
			{
				HomeToolBarBackgroundColor = "#B2121E",
				ToolBarForeground = "#FFFFFF",
				ThemeType = 0,
				ThemesID = 15,
				ToolBarForegroundIcon = 1
			};
			GetBanner themeLibraryLic = UtilContants.GetThemeLibraryLic(this, library);
			Settings.Default.CurrentTheme = new Theme
			{
				HomeToolBarBackgroundColor = "#B2121E",
				ToolBarForeground = "#FFFFFF",
				ThemeType = 0,
				ThemesID = 15,
				ToolBarForegroundIcon = 1
			};
			if (themeLibraryLic != null)
			{
				Settings.Default.CurrentTheme.BannerImage = themeLibraryLic.Banner;
				Settings.Default.CurrentTheme.LogoImage = themeLibraryLic.Logo;
			}
			Settings.Default.Save();
			base.Icon = UtilContants.CreateImageSource(Settings.Default.CurrentTheme.LogoImage);
			this.ScrollbarForeground = "#B2121E";
			try
			{
				Book book = Settings.Default.ReadingBook;
				if (book != null)
				{
					this.ucHeader.ReadingBook = book;
				}
			}
			catch (Exception)
			{
			}
			this.ucHeader.configAfterInitCurrentLib();
		}

		// Token: 0x0600012E RID: 302 RVA: 0x00004544 File Offset: 0x00002744
		protected virtual void OnPropertyChanged(string newValue)
		{
			if (this.PropertyChanged != null)
			{
				this.PropertyChanged(this, new PropertyChangedEventArgs(newValue));
			}
		}

		// Token: 0x0600012F RID: 303 RVA: 0x00004560 File Offset: 0x00002760
		public void RedirectBookDetail(int productID, UserControl parentForm)
		{
			this.mainPanel.Children.Clear();
			this.usercontrol = new ucBookDetail(this, (long)productID, parentForm);
			this.mainPanel.Children.Add(this.usercontrol);
		}

		// Token: 0x06000130 RID: 304 RVA: 0x00004598 File Offset: 0x00002798
		public void RedirectToListBook()
		{
			this.ucHeader.setActiveBtnLibrary();
			this.mainPanel.Children.Clear();
			if (this.listBook == null)
			{
				this.listBook = new ucListBook(this);
			}
			this.mainPanel.Children.Add(this.listBook);
			this.ucHeader.UCListBook = this.listBook;
			this.ucHeader.ActivedUC = this.listBook.GetType().Name;
		}

		// Token: 0x06000131 RID: 305 RVA: 0x00004618 File Offset: 0x00002818
		public void RedirectToListBookDetail(long categoryID)
		{
			this.mainPanel.Children.Clear();
			if (this.listBookDetail == null)
			{
				this.listBookDetail = new ucListBookDetail(this, categoryID, "");
			}
			this.mainPanel.Children.Add(this.listBookDetail);
		}

		// Token: 0x06000132 RID: 306 RVA: 0x00004666 File Offset: 0x00002866
		public void RedirectToListLibrary()
		{
			this.mainPanel.Children.Clear();
		}

		// Token: 0x06000133 RID: 307 RVA: 0x00004678 File Offset: 0x00002878
		public void RedirectToPage(UIElement uIElement)
		{
			this.mainPanel.Children.Clear();
			this.mainPanel.Children.Add(uIElement);
		}

		// Token: 0x06000134 RID: 308 RVA: 0x0000469C File Offset: 0x0000289C
		public void ShowData()
		{
			this.mainPanel.Children.Clear();
			this.userControl = new ucBookShelf(this);
			this.mainPanel.Children.Add(this.userControl);
		}

		// Token: 0x06000135 RID: 309 RVA: 0x000046D1 File Offset: 0x000028D1
		public void addEventClose()
		{
			if (this.closeWindow != null)
			{
				base.Closed += this.closeWindow;
			}
		}

		// Token: 0x06000136 RID: 310 RVA: 0x000046E7 File Offset: 0x000028E7
		private void DongApp(object sender, EventArgs e)
		{
			if (BienChung.Instance.BookRead != null)
			{
				DBSqlite.Instance.UpdateBookReadPositon(BienChung.Instance.BookRead);
			}
		}

		// Token: 0x06000137 RID: 311 RVA: 0x0000470C File Offset: 0x0000290C
		public async Task LuuThoiGianDocLenServer()
		{
			await Task.Run(delegate
			{
				IEnumerable<ThoiGianDoc> thoiGianDoc = DBSqlite.Instance.GetThoiGianDoc();
				if (thoiGianDoc != null && thoiGianDoc.Count<ThoiGianDoc>() > 0)
				{
					string text = JsonConvert.SerializeObject(thoiGianDoc);
					UtilContants.GetDataFromServices<int>(string.Format("{0}{1}", MainApp.currentLibrary.Domain.ToString(), "/api/patron/InsertTimeRead"), Common.RequestMethod.POST, text);
					List<ThoiGianDoc> list = thoiGianDoc.ToList<ThoiGianDoc>();
					foreach (ThoiGianDoc thoiGianDoc2 in list)
					{
						thoiGianDoc2.DaUpdate = true;
					}
					DBSqlite.Instance.UpDateThoiGianDoc(list);
				}
			});
		}

		// Token: 0x14000003 RID: 3
		// (add) Token: 0x06000138 RID: 312 RVA: 0x00004748 File Offset: 0x00002948
		// (remove) Token: 0x06000139 RID: 313 RVA: 0x00004780 File Offset: 0x00002980
		public event PropertyChangedEventHandler PropertyChanged;

		// Token: 0x0600013A RID: 314 RVA: 0x000047B8 File Offset: 0x000029B8
		private void Button_Click(object sender, RoutedEventArgs e)
		{
			if (!Directory.Exists("C:\\ProgramData\\Bookworm"))
			{
				Directory.CreateDirectory("C:\\ProgramData\\Bookworm");
			}
			File.Create("C:\\ProgramData\\Bookworm\\HaveCS.txt");
			this.ChinhSach.Visibility = Visibility.Collapsed;
			this.Chinh.Visibility = Visibility.Visible;
			this.InitChinh();
			this.ucHeader.HienThiFormDangNhap();
		}

		// Token: 0x0600013B RID: 315 RVA: 0x00004810 File Offset: 0x00002A10
		private void SvcName_PreviewMouseWheel(object sender, MouseWheelEventArgs e)
		{
			ScrollViewer scrollViewer = sender as ScrollViewer;
			double num = (double)e.Delta;
			double verticalOffset = scrollViewer.VerticalOffset;
			scrollViewer.ScrollToVerticalOffset(verticalOffset - num);
		}

		// Token: 0x0600013C RID: 316 RVA: 0x0000483C File Offset: 0x00002A3C
		public void goListBook()
		{
			this.mainPanel.Children.Clear();
			if (this.listBook == null)
			{
				this.listBook = new ucListBook(this);
			}
			this.mainPanel.Children.Add(this.listBook);
			this.ucHeader.ActivedUC = this.listBook.GetType().Name;
		}

		// Token: 0x0600013D RID: 317 RVA: 0x000048A0 File Offset: 0x00002AA0
		public void goListBookDetail()
		{
			this.mainPanel.Children.Clear();
			if (this.listBookDetail == null)
			{
				this.listBookDetail = new ucListBookDetail(this, 0L, "");
			}
			this.mainPanel.Children.Add(this.listBookDetail);
			this.ucHeader.ActivedUC = this.listBookDetail.GetType().Name;
		}

		// Token: 0x04000089 RID: 137
		public static string currentProCode = string.Empty;

		// Token: 0x0400008A RID: 138
		public static string currentProName = string.Empty;

		// Token: 0x0400008B RID: 139
		public static bool haveDangNhap = true;

		// Token: 0x0400008C RID: 140
		public static long LoggedUserID;

		// Token: 0x0400008D RID: 141
		public static bool LoggedNew = false;

		// Token: 0x0400008E RID: 142
		public static string LoggedUserName = string.Empty;

		// Token: 0x0400008F RID: 143
		public static string LoggedFullName = string.Empty;

		// Token: 0x04000090 RID: 144
		public static string LoggedUserToken = string.Empty;

		// Token: 0x04000091 RID: 145
		public static string UserPassword = string.Empty;

		// Token: 0x04000092 RID: 146
		public static long AllowUpload = 0L;

		// Token: 0x04000093 RID: 147
		public static int lastPageView;

		// Token: 0x04000094 RID: 148
		public static int haveIP = 1;

		// Token: 0x04000095 RID: 149
		public static Library currentLibrary;

		// Token: 0x04000096 RID: 150
		public static List<ProductDetail> ListCacheDownloadBook = new List<ProductDetail>();

		// Token: 0x04000097 RID: 151
		public static ucEreader readingBook;

		// Token: 0x04000098 RID: 152
		public static bool IsKeepLoggedIn = false;

		// Token: 0x04000099 RID: 153
		private string _scrollbarForeground;

		// Token: 0x0400009C RID: 156
		public ucBookShelf userControl;

		// Token: 0x0400009D RID: 157
		private ucLoginForm loginForm;

		// Token: 0x0400009E RID: 158
		private ucBookDetail usercontrol;

		// Token: 0x040000A0 RID: 160
		private ucListBook listBook;

		// Token: 0x040000A1 RID: 161
		public ucListBookDetail listBookDetail;
	}
}
