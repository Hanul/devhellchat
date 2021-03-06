global.ChatController = OBJECT({
	
	init : (inner, self) => {
		
		const URL_REGEX = /(http|https|ftp|telnet|news|mms):\/[^\"\'\s()]+/i;
		const MAX_UPLOAD_FILE_SIZE = 26214400;
		const connectedTime = new Date().getTime();
		
		// Firebase Ref들 가져오기
		let chatsRef = firebase.database().ref('chats');
		let iconsRef = firebase.storage().ref('icons');
		let chatUploadsRef = chatUploadApp.storage().ref('uploads');
		let chatUploads2Ref = chatUploadApp2.storage().ref('uploads');
		
		// 스킨 설정
		let chatStore = STORE('DevHellChat');
		let skin = chatStore.get('skin');
		if (skin === undefined) {
			skin = '기본';
		}
		
		let skinData = SKINS[skin];
		if (skinData === undefined) {
			skinData = SKINS.기본
		}
		
		let isHiding = true;
		let messageList;
		let messageForm;
		
		let scrollToEnd = () => {
			if (messageList !== undefined) {
				messageList.scrollTo({
					top : 999999
				});
			}
		};
		
		let hide = self.hide = () => {
			isHiding = true;
			
			if (messageList !== undefined) {
				messageList.hide();
			}
			if (messageForm !== undefined) {
				messageForm.hide();
			}
		};
		
		let show = self.show = () => {
			isHiding = false;
			
			if (messageList !== undefined) {
				messageList.show();
			}
			if (messageForm !== undefined) {
				messageForm.show();
			}
			
			scrollToEnd();
		};
		
		let isInited = false;
		let checkIsInited = self.checkIsInited = () => {
			return isInited;
		};
		
		// 컨트롤러를 초기화합니다.
		let init = self.init = (user) => {
			isInited = true;
			
			// 호출 허락 (아이폰은 지원안함)
			if (global.Notification !== undefined && Notification.permission !== 'granted') {
				Notification.requestPermission();
			}
			
			let iconMap = {};
			
			// 로그인한 유저의 아이콘을 가져옵니다.
			LoadIcon(user.uid, (url) => {
				EACH(iconMap[user.uid], (icon) => {
					icon.setSrc(url);
				});
			});
			
			let preview;
			
			// 채팅 목록
			messageList = DIV({
				style : {
					position : 'relative',
					backgroundColor : skinData.backgroundColor,
					color : skinData.color,
					paddingTop : 10,
					overflowY : 'scroll',
					onDisplayResize : (width, height) => {
						
						// 모바일
						if (width <= 1280) {
							return {
								fontSize : 14,
								height : height - 58 - 38
							};
						} else {
							return {
								fontSize : 15,
								height : height - 58 - 38
							};
						}
					}
				}
			}).appendTo(Layout.getContent());
			
			// 시스템 메시지 추가
			let addSystemMessage = self.addSystemMessage = (title, message, scroll) => {
				
				let isToScrollBottom = messageList.getScrollTop() >= messageList.getScrollHeight() - messageList.getHeight() - 10;
				
				let children = ['[' + title + '] '];
				if (CHECK_IS_ARRAY(message) === true) {
					EXTEND({
						origin : children,
						extend : message
					});
				} else {
					children.push(message);
				}
				
				messageList.append(DIV({
					style : {
						color : skinData.systemColor,
						fontWeight : 'bold',
						onDisplayResize : (width, height) => {
							
							// 모바일
							if (width <= 1280) {
								return {
									padding : '0 6px',
									paddingBottom : 6
								};
							} else {
								return {
									padding : '0 8px',
									paddingBottom : 8
								};
							}
						}
					},
					c : children
				}));
				
				if (scroll !== false || isToScrollBottom === true) {
					scrollToEnd();
				}
			};
			
			// 최근 접속 유저 출력
			let showRecentlyUsers = self.showRecentlyUsers = () => {
				
				let names = '';
				EACH(ConnectionController.getRecentlyUsers(), (recentlyUser, i) => {
					if (i > 0) {
						names += ', ';
					}
					names += recentlyUser.name;
				});
				
				addSystemMessage('접속자 ' + ConnectionController.getRecentlyUsers().length + '명', names);
			};
			
			// 공지사항 출력
			let showNotice = self.showNotice = () => {
				addSystemMessage('공지', '갓이어베이스에서 web.app 도메인을 제공하기 시작했으므로 https://devhellchat.web.app 이걸루다가 접속해주세여ㅋㅋ');
			};
			
			// 화면 크기가 바뀌면 스크롤 맨 아래로
			EVENT('resize', () => {
				DELAY(() => {
					scrollToEnd();
				});
			});
			
			let sendMessage = self.sendMessage = (message) => {
				
				chatsRef.push({
					userId : user.uid,
					name : user.displayName,
					userIconURL : ConnectionController.getUserIconURL(),
					message : message,
					createTime : Date.now()
				});
				
				UserController.increaseEXP(10);
			};
			
			// 메시지 입력 폼
			let messageInput;
			let uploadInput;
			let uploadInput2;
			let uploadButton;
			let uploadButton2;
			let semiMenu;
			let collectionButton;
			
			global.Collections.appendTo(BODY);
			global.Collections.hide();

			messageForm = FORM({
				style : {
					position : 'absolute',
					bottom : 0,
					width : '100%',
					borderTop : '1px solid ' + skinData.lineColor
				},
				c : [
				messageInput = UUI.FULL_INPUT({
					style : {
						backgroundColor : skinData.backgroundColor,
						padding : 8,
						fontSize : 15
					},
					inputStyle : {
						color : skinData.color,
						onDisplayResize : (width) => {
							return {
								width : Layout.getContent().getWidth() - 145
							};
						}
					},
					name : 'message',
					placeholder : '메시지 입력 ㄱㄱ',
					isOffAutocomplete : true,
					on : {
						keydown : (e) => {
							if (e.getKey() === 'Escape') {
								if (semiMenu !== undefined) {
									semiMenu.remove();
								}
							}
						},
						doubletap : () => {
							
							if (semiMenu !== undefined) {
								semiMenu.remove();
							}
							
							semiMenu = DIV({
								style : {
									position : 'absolute',
									left : 5,
									bottom : 43
								},
								c : [A({
									style : {
										flt : 'left',
										padding : '4px 8px',
										border : '1px solid #999',
										backgroundColor : '#eee',
										color : '#000',
										borderRadius : 3
									},
									c : '접속자 보기',
									on : {
										touchstart : () => {
											showRecentlyUsers();
											DELAY(() => {
												messageInput.focus();
											});
										}
									}
								}), A({
									style : {
										marginLeft : 5,
										flt : 'left',
										padding : '4px 8px',
										border : '1px solid #999',
										backgroundColor : '#eee',
										color : '#000',
										borderRadius : 3
									},
									c : '내 정보 보기',
									on : {
										touchstart : () => {
											GO('user/' + user.uid);
										}
									}
								}), CLEAR_BOTH()]
							}).appendTo(Layout.getContent());
							
							EVENT_ONCE('touchstart', () => {
								if (semiMenu !== undefined) {
									semiMenu.remove();
									semiMenu = undefined;
								}
							});
						}
					}
				}),
				
				// 설정 버튼
				A({
					style : {
						position : 'absolute',
						right : 70,
						bottom : 0,
						padding : 8,
						color : '#ccc',
						fontSize : 16
					},
					c : FontAwesome.GetIcon('grin-wink'),
					on : {
						mouseover : (e, button) => {
							button.addStyle({
								color : '#999'
							});
						},
						mouseout : (e, button) => {
							button.addStyle({
								color : '#ccc'
							});
						},
						tap : () => {
							
							// 설정 창 띄우기
							let uploadInput;
							let iconPreview;
							let description;
							Yogurt.Alert({
								msg : [
									H3({
										style : {
											fontWeight : 'bold'
										},
										c : '아이콘 설정'
									}), uploadInput = INPUT({
										style : {
											position : 'fixed',
											left : -999999,
											top : -999999
										},
										type : 'file',
										on : {
											change : () => {
												let file = uploadInput.getEl().files[0];
												
												if (file !== undefined) {
													
													if (file.size !== undefined && file.size <= 10240) {
														
														description.empty();
														description.append('업로드 중...');
														
														iconsRef.child(user.uid).put(file, {
															cacheControl : 'public,max-age=31536000'
														}).then((snapshot) => {
															iconsRef.child(user.uid).getDownloadURL().then((url) => {
																
																iconPreview.setSrc(url);
																
																description.empty();
																description.append('10KB 이하 PNG만 가능');
															});
														});
													}
													
													else {
														alert('용량이 너무큼! 최대 용량 10KB 임');
														uploadInput.setValue('');
													}
												}
											}
										}
									}), A({
										c : iconPreview = IMG({
											style : {
												marginTop : 10,
												width : 40,
												height : 40,
												borderRadius : 10
											},
											src : LoadIcon.getUserIconURL(user.uid) === undefined ? ConnectionController.getUserIconURL() : LoadIcon.getUserIconURL(user.uid)
										}),
										on : {
											tap : () => {
												uploadInput.select();
											}
										}
									}), description = P({
										c : '10KB 이하 PNG만 가능'
									})	
								]
							});
						}
					}
				}),
				
				uploadInput = INPUT({
					style : {
						position : 'fixed',
						left : -999999,
						top : -999999
					},
					type : 'file',
					on : {
						change : () => {
							let file = uploadInput.getEl().files[0];
							
							if (file !== undefined) {
								
								if (file.size !== undefined && file.size <= MAX_UPLOAD_FILE_SIZE) {
									uploadFile(file);
									uploadInput.setValue('');
								}
								
								else {
									alert('용량이 너무큼! 최대 용량 ' + INTEGER(MAX_UPLOAD_FILE_SIZE / 1024 / 1024) + 'MB 임');
									uploadInput.setValue('');
								}
							}
						}
					}
				}),
				
				uploadInput2 = INPUT({
					style : {
						position : 'fixed',
						left : -999999,
						top : -999999
					},
					type : 'file',
					on : {
						change : () => {
							let file = uploadInput2.getEl().files[0];
							
							if (file !== undefined) {
								
								if (file.size !== undefined && file.size <= MAX_UPLOAD_FILE_SIZE) {
									uploadFile2(file);
									uploadInput2.setValue('');
								}
								
								else {
									alert('용량이 너무큼! 최대 용량 ' + INTEGER(MAX_UPLOAD_FILE_SIZE / 1024 / 1024) + 'MB 임');
									uploadInput2.setValue('');
								}
							}
						}
					}
				}),
				
				// 업로드 버튼
				uploadButton = A({
					style : {
						position : 'absolute',
						right : 40,
						bottom : 0,
						padding : 8,
						color : '#ccc',
						fontSize : 16
					},
					c : FontAwesome.GetIcon('upload'),
					on : {
						mouseover : (e, button) => {
							button.addStyle({
								color : '#999'
							});
						},
						mouseout : (e, button) => {
							button.addStyle({
								color : '#ccc'
							});
						},
						tap : () => {
							uploadInput.select();
						}
					}
				}),
				
				// 업로드 버튼2
				uploadButton2 = A({
					style : {
						position : 'absolute',
						right : 10,
						bottom : 0,
						padding : 8,
						color : '#ccc',
						fontSize : 16
					},
					c : FontAwesome.GetIcon('upload'),
					on : {
						mouseover : (e, button) => {
							button.addStyle({
								color : '#999'
							});
						},
						mouseout : (e, button) => {
							button.addStyle({
								color : '#ccc'
							});
						},
						tap : () => {
							uploadInput2.select();
						}
					}
				}),

				// 모아보기 버튼
				collectionButton = A({
					style : {
						position : 'absolute',
						right : 100,
						bottom : 0,
						padding : 8,
						color : '#ccc',
						fontSize : 16
					},
					c : FontAwesome.GetIcon('archive'),
					on : {
						mouseover : (e, button) => {
							button.addStyle({
								color : '#999'
							});
						},
						mouseout : (e, button) => {
							button.addStyle({
								color : '#ccc'
							});
						},
						tap : () => {
							if (global.Collections.getEl().style.display === 'none')
								global.Collections.show();
							else
								global.Collections.hide();
						}
					}
				})],
				
				on : {
					submit : (e, form) => {
						
						let message = form.getData().message;
						form.setData({});
						
						if (message !== '') {
							
							// 명령어 처리
							if (message[0] === '/') {
								
								let args = message.substring(1).split(' ');
								let command = args[0];
								args.shift();
								
								if (command === '닉네임') {
									
									let originName = user.displayName;
									
									if (args.length === 0) {
										addSystemMessage('사용법', '/닉네임 {name}');
									}
									
									else if (originName !== args[0] && /^[ㄱ-ㅎ가-힣a-zA-Z0-9]{1,6}$/.test(args[0]) === true) {
										user.updateProfile({
											displayName : args[0]
										}).then(() => {
											chatsRef.push({
												isNameChanged : true,
												originName : originName,
												newName : user.displayName
											});
											refreshConnection();
										});
									}
								}
								
								else if (command === '접속자') {
									showRecentlyUsers();
								}
								
								else if (command === '스킨') {
									
									if (args.length === 0) {
										let skinStr = '';
										EACH(SKINS, (skinData, skin) => {
											if (skinStr !== '') {
												skinStr += ', ';
											}
											skinStr += skin;
										});
										addSystemMessage('사용법', '/스킨 {skin}\n[스킨 종류] ' + skinStr);
									}
									
									else if (SKINS[args[0]] !== undefined) {
										chatStore.save({
											name : 'skin',
											value : args[0]
										});
										location.reload();
									}
								}
								
								else if (command === '이모티콘') {
									let emoticonStr = '';
									EACH(EMOTICONS, (notUsing, emoticon) => {
										if (emoticonStr !== '') {
											emoticonStr += ', ';
										}
										emoticonStr += emoticon;
									});
									addSystemMessage('사용법', '메시지 중간에 :이모티콘:과 같은 형태로 사용, 다른 사람이 쓴 이모티콘을 더블클릭하면 복사 가능\n[이모티콘 종류] ' + emoticonStr);
								}
								
								else if (command === '처치') {
									
									if (args.length === 0) {
										addSystemMessage('사용법', '/처치 [이름]');
									}
									
									else {
										chatsRef.push({
											userId : user.uid,
											name : user.displayName,
											userIconURL : ConnectionController.getUserIconURL(),
											targetName : args[0].substring(0, 20),
											isEliminated : true
										});
									}
								}
								
								else if (command === '겜스버그') {
									
									if (args.length === 0) {
										addSystemMessage('사용법', '/겜스버그 [내용]');
									}
									
									else {
										chatsRef.push({
											userId : user.uid,
											name : user.displayName,
											userIconURL : ConnectionController.getUserIconURL(),
											message : message.substring(5),
											isGamsberg : true
										});
									}
								}
								
								else if (command === '레벨') {
									UserController.getUserData(user.uid, (userData) => {
										addSystemMessage(user.displayName + '님 레벨', 'Lv. ' + userData.level);
									});
								}
								
								else if (command === '로그아웃') {
									firebase.auth().signOut();
								}
								
								else if (command === '참피온') {
									chatStore.remove('champioff');
									addSystemMessage('참피온', '이제 참피 관련 단어 보임');
								}
								
								else if (command === '참피오프') {
									chatStore.save({
										name : 'champioff',
										value : true
									});
									addSystemMessage('참피오프', '이제 참피 관련 단어 숨겨짐');
								}
								
								/*else if (command === '욕차단') {
									chatStore.save({
										name : 'badwordfilteron',
										value : true
									});
									addSystemMessage('욕차단', '이제 욕 차단댐');
								}
								
								else if (command === '욕안차단') {
									chatStore.remove('badwordfilteron');
									addSystemMessage('욕안차단', '이제 욕 다 보임');
								}*/
								
								else {
									addSystemMessage('명령어', '/명령어, /닉네임, /접속자, /스킨, /이모티콘, /처치, /겜스버그, /레벨, /로그아웃, /참피온, /참피오프');
								}
							}
							
							// 메시지 전송
							else {
								sendMessage(message.trim());
							}
						}
					}
				}
			}).appendTo(Layout.getContent());
			
			messageInput.focus();
			
			// 로딩 이미지
			let loading = DIV({
				style : {
					position : 'absolute',
					left : 5,
					bottom : global.is2 === true ? 0 : 2,
					color : skinData.systemColor,
					fontWeight : 'bold',
					lineHeight : 0
				},
				c : [IMG({
					src : '/resource/loading.svg'
				}), global.is2 === true ? undefined : P({
					c : ['접속이 안될땐 ', A({
						style : {
							textDecoration : 'underline'
						},
						href : '2.html',
						c : '대피소'
					}), '로~']
				})]
			}).appendTo(messageList);
			
			// 파일 업로드 처리
			let uploadFile = (file) => {
				
				let fileId = UUID();
				
				let uploadTask = chatUploadsRef.child(fileId).child(file.name).put(file, {
					cacheControl : 'public,max-age=31536000'
				});
				
				uploadTask.on('state_changed', (snapshot) => {
					uploadButton.empty();
					uploadButton.append(INTEGER((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
				}, () => {
					uploadButton.empty();
					uploadButton.append(FontAwesome.GetIcon('upload'));
					uploadButton.addStyle({
						color : '#ccc'
					});
				}, () => {
					uploadButton.empty();
					uploadButton.append(FontAwesome.GetIcon('upload'));
					uploadButton.addStyle({
						color : '#ccc'
					});
					
					uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
						chatsRef.push({
							userId : user.uid,
							name : user.displayName,
							userIconURL : ConnectionController.getUserIconURL(),
							uploadServer : 'chatUploadApp',
							fileId : fileId,
							fileName : file.name,
							downloadURL : downloadURL,
							isImage : file.type.indexOf('image') !== -1
						});
					});
				});
			};
			
			// 파일 업로드2 처리
			let uploadFile2 = (file) => {
				
				let fileId = UUID();
				
				let uploadTask = chatUploads2Ref.child(fileId).child(file.name).put(file, {
					cacheControl : 'public,max-age=31536000'
				});
				
				uploadTask.on('state_changed', (snapshot) => {
					uploadButton2.empty();
					uploadButton2.append(INTEGER((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
				}, () => {
					uploadButton2.empty();
					uploadButton2.append(FontAwesome.GetIcon('upload'));
					uploadButton2.addStyle({
						color : '#ccc'
					});
				}, () => {
					uploadButton2.empty();
					uploadButton2.append(FontAwesome.GetIcon('upload'));
					uploadButton2.addStyle({
						color : '#ccc'
					});
					
					uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
						chatsRef.push({
							userId : user.uid,
							name : user.displayName,
							userIconURL : ConnectionController.getUserIconURL(),
							uploadServer : 'chatUploadApp2',
							fileId : fileId,
							fileName : file.name,
							downloadURL : downloadURL,
							isImage : file.type.indexOf('image') !== -1
						});
					});
				});
			};
			
			let chatDataSet = [];
			global.bus = {
				links : [],
				files : [],
				codes : [],
				pictures : [],
				target : {
					name : '',
					index : -1
				},
				// time : '',
				debug : 'links / files / codes / pictures'
			};
			
			// 새 메시지가 추가되면
			chatsRef.on('child_added', (snapshot) => {
				// console.log(snapshot, snapshot.val());
				// 메시지 닉네임 바뀔때마다 배경색
				// const chat = snapshot.node_.children_.root_.left;
				// const nickname = chat.right.value.value_;
				// const prevNickname = (chatDataSet[chatDataSet.length-1] || {}).name;

				// if (nickname && prevNickname && nickname !== prevNickname) {
				// 	backColor = backColor === '#FFF' ? '#F7F7F7' : '#FFF';
				// }

				loading.remove();
				
				let isToScrollBottom = messageList.getScrollTop() >= messageList.getScrollHeight() - messageList.getHeight() - 10;
				
				let chatData = snapshot.val();
				chatData.key = snapshot.key;
				
				chatDataSet.push(chatData);
				
				// 닉변 알림
				if (chatData.isNameChanged === true) {
					addSystemMessage('닉네임 변경', [chatData.originName, FontAwesome.GetIcon({
						style : {
							margin : '0px 5px'
						},
						key : 'caret-right'
					}), chatData.newName]);
				}
				
				// 새 유게짱
				else if (chatData.isUGay === true) {
					addSystemMessage('새 유게짱!', A({
						style : {
							textDecoration : 'underline'
						},
						c : chatData.title + ', by ' + chatData.name,
						on : {
							tap : () => {
								GO('u-gay');
							}
						}
					}));
				}
				
				// 새 메시지
				else {
					
					let icon;
					let message;
					messageList.append(message = DIV({
						style : {
							onDisplayResize : (width, height) => {
								// 모바일
								if (width <= 1280) {
									return {
										padding : '0 6px',
										paddingBottom : 6
									};
								} else {
									return {
										padding : '0 8px',
										paddingBottom : 8
									};
								}
							},
							position : 'relative'
						},
						on : {
							mouseover : (e, el) => {
								el.addStyle({
									backgroundColor : '#' + (parseInt(skinData.backgroundColor.replace('#', ''), 16) - 328965).toString(16),
								});

								// 컨벤션에 올바른지 검토 필요
								const time = el.getContentEl().querySelector('span.time');
								if (time) {
									time.style.opacity = 1;
								}
							},
							mouseout : (e, el) => {
								el.addStyle({
									backgroundColor: 'initial',
								});

								// 컨벤션에 올바른지 검토 필요
								const time = el.getContentEl().querySelector('span.time');
								if (time) {
									time.style.opacity = 0;
								}
							}
						},
						c : [icon = IMG({
							style : {
								marginRight : 5,
								backgroundColor : '#fff',
								onDisplayResize : (width, height) => {
									// 모바일
									if (width <= 1280) {
										return {
											marginBottom : -4,
											width : 18,
											height : 18,
											borderRadius : 4
										};
									} else {
										return {
											marginBottom : -5,
											width : 20,
											height : 20,
											borderRadius : 5
										};
									}
								}
							},
							src : LoadIcon.getUserIconURL(chatData.userId) === undefined ? chatData.userIconURL : LoadIcon.getUserIconURL(chatData.userId)
						}), A({
							style : {
								fontWeight : 'bold',
								marginRight : 6,
								color : skinData.nameColor
							},
							c : chatData.name,
							on : {
								tap : (e) => {
									e.stop();
									
									ContextMenu({
										style : {
											left : e.getLeft(),
											top : e.getTop()
										},
										c : [LI({
											style : ContextMenu.getItemStyle(),
											c : UUI.BUTTON_H({
												style : {
													margin : 'auto'
												},
												icon : FontAwesome.GetIcon({
													style : {
														marginTop : 1
													},
													key : 'id-card'
												}),
												spacing : 8,
												title : MSG({
													ko : '정보보기'
												})
											}),
											on : {
												tap : () => {
													GO('user/' + chatData.userId);
												}
											}
										}), LI({
											style : ContextMenu.getItemStyle(),
											c : UUI.BUTTON_H({
												style : {
													margin : 'auto'
												},
												icon : FontAwesome.GetIcon({
													style : {
														marginTop : 1
													},
													key : 'phone-square'
												}),
												spacing : 8,
												title : MSG({
													ko : '호출하기'
												})
											}),
											on : {
												tap : () => {
													ChatController.sendMessage('@' + chatData.name);
												}
											}
										})]
									});
								}
							}
						}), SPAN({
							style : {
								fontSize : 0
							},
							c : ' : '
						}),
						
						// 업로드인 경우
						chatData.downloadURL !== undefined ? A({
							style : {
								fontWeight : 'bold',
								textDecoration : 'underline'
							},
							c : chatData.fileName !== undefined ? chatData.fileName : chatData.downloadURL,
							target : '_blank',
							href : chatData.downloadURL,
							on : {
								DOMNodeInsertedIntoDocument : () => {
									if (chatData.isImage) {
										global.bus.pictures.push({
											fileName : chatData.fileName,
											downloadURL : chatData.downloadURL,
											name : chatData.name,
											userIconURL : chatData.userIconURL,
											userId : chatData.userId,
										});
										global.bus.target.name = 'pictures';
										global.bus.target.index = global.bus.pictures.length - 1;
									} else {
										global.bus.files.push({
											fileName : chatData.fileName,
											downloadURL : chatData.downloadURL,
											name : chatData.name,
											userIconURL : chatData.userIconURL,
											userId : chatData.userId,
										});
										global.bus.target.name = 'files';
										global.bus.target.index = global.bus.files.length - 1;
									}
									// let cal = CALENDAR(new Date(chatData.createTime));
									// global.bus.time = cal.getHour(true) + ':' + cal.getMinute(true) + ':' + cal.getSecond(true);
									global.Collections.fireEvent('bus');
								},
								mouseover : (e) => {
									
									// 모바일 제외
									if (
									INFO.getOSName() !== 'Android' && INFO.getOSName() !== 'iOS' &&
									preview === undefined && chatData.isImage === true) {
										
										preview = UUI.V_CENTER({
											style : {
												position : 'fixed',
												left : e.getLeft() + 10,
												top : e.getTop() - 42 - 8,
												width : 90,
												height : 90,
												backgroundColor : '#fff',
												backgroundImage : chatData.downloadURL,
												backgroundSize : 'cover',
												backgroundPosition : 'center center',
												border : '1px solid #333',
												textAlign : 'center'
											},
											c : IMG({
												style : {
													marginTop : 10,
													height : 40
												},
												src : '/resource/loading.svg'
											})
										}).appendTo(BODY);
										
										IMG({
											src : chatData.downloadURL,
											on : {
												load : () => {
													if (preview !== undefined) {
														preview.empty();
													}
												}
											}
										});
									}
								},
								mouseout : () => {
									if (preview !== undefined) {
										preview.remove();
										preview = undefined;
									}
								}
							}
						})
						
						:
						
						(
							chatData.isEliminated === true ?
							
							// 처치인 경우
							SPAN({
								style : {
									fontFamily : 'Koverwatch',
									fontStyle : 'italic',
									textShadow : TextBorderShadow('#333'),
									fontSize : 20,
									letterSpacing : 2
								},
								c : [SPAN({
									style : {
										color : '#ff1a1a'
									},
									c : chatData.targetName
								}), SPAN({
									style : {
										color : '#fff'
									},
									c : ' 처치'
								}), SPAN({
									style : {
										color : '#ff1a1a'
									},
									c : ' (+100) '
								})]
							})
							
							:
							
							(
								chatData.isGamsberg === true ?
								
								// 겜스버그인 경우
								A({
									style : {
										fontWeight : 'bold',
										textDecoration : 'underline'
									},
									c : '오류 발생!',
									on : {
										tap : () => {
											
											let popup = DIV({
												style : {
													position : 'fixed',
													zIndex : 999999,
													width : 483 / 2,
													height : 895 / 2,
													backgroundImage : '/resource/gamsberg.png',
													backgroundSize : 'cover',
													onDisplayResize : (width, height) => {
														return {
															left : width / 2 - 483 / 4,
															top : height / 2 - 895 / 4
														};
													},
													boxShadow : '4px 4px 2px 2px rgba(0, 0, 0, 0.5)'
												},
												c : [P({
													style : {
														position : 'absolute',
														left : 15,
														top : 132,
														width : 215,
														fontSize : 12,
														lineHeight : '1.25em'
													},
													c : chatData.message
												}), A({
													style : {
														position : 'absolute',
														left : 62,
														bottom : 8,
														width : 116,
														height : 27
													},
													on : {
														tap : () => {
															popup.remove();
														}
													}
												})]
											}).appendTo(BODY);
										}
									}
								})
								
								:
								
								// 일반 메시지인 경우
								RUN(() => {
									
									let message = chatData.message;
									// console.log(chatData);
									// let cal = CALENDAR(new Date(chatData.createTime));
									//message.getEl().title = '작성 시간 ' + cal.getHour(true) + ':' + cal.getMinute(true) + ':' + cal.getSecond(true);
									
									// 참피 필터링
									if (chatStore.get('champioff') === true) {
										message = UTIL.champiFilter(message);
									}
									
									// 욕 필터링
									if (chatStore.get('badwordfilteron') === true) {
										message = BadWordFilter.Replace({
											text : message,
											language : 'ko'
										});
									}
									
									let originMessage = message;
									
									if (message.length > 200) {
										message = message.substring(0, 200);
									}
									
									// 호출 기능
									if (chatData.isCalled !== true && chatData.name !== user.displayName && (message + ' ').indexOf('@' + user.displayName + ' ') !== -1) {
										
										// 아이폰은 지원 안함
										if ((global.Notification === undefined || Notification.permission !== 'granted') && (chatData.createTime || 0) > connectedTime) {
											DELAY(() => {
												chatsRef.push({
													userId : user.uid,
													name : user.displayName,
													userIconURL : ConnectionController.getUserIconURL(),
													message : '(호출 기능이 차단된 유저입니다)'
												});
											});
										}
										
										else if (document.hasFocus() !== true) {
											new Notification(chatData.name, {
												body : message,
											}).onclick = () => {
												focus();
											};
										}
										
										let updates = {};
										chatData.isCalled = true;
										updates[snapshot.key] = chatData;
										chatsRef.update(updates);
									}
									
									let children = [];
									
									EACH(message.split(' '), (message, i) => {
										
										if (i > 0) {
											children.push(' ');
										}
										
										// 이모티콘을 찾아 교체합니다.
										let replaceEmoticon = (message) => {
											
											let match = message.match(/:[^:]*:/);
											if (match === TO_DELETE) {
												children.push(message);
											}
											
											else {
												
												let emoticonStr = match[0];
												let emoticon = emoticonStr.substring(1, emoticonStr.length - 1).toLowerCase();
												
												if (EMOTICONS[emoticon] !== undefined) {
													
													let index = message.indexOf(emoticonStr);
													
													children.push(message.substring(0, index));
													
													children.push(IMG({
														style : {
															marginBottom : -4
														},
														src : '/resource/emoticon/' + emoticon + (EMOTICONS[emoticon].isGIF === true ? '.gif' : '.png') + (EMOTICONS[emoticon].isNoCaching === true ? '?' + Date.now() : ''),
														on : {
															load : () => {
																// 로딩이 다 되면 스크롤 끝으로
																if (isToScrollBottom === true || chatData.userId === user.uid) {
																	scrollToEnd();
																}
															},
															doubletap : (e) => {
																
																messageInput.setValue(messageInput.getValue() + ':' + emoticon + ':');
																messageInput.focus();
																
																e.stopDefault();
															}
														}
													}));
													
													message = replaceEmoticon(message.substring(index + emoticonStr.length));
												}
												
												else {
													children.push(message);
												}
											}
											
											return message;
										};
										
										// 링크를 찾아 교체합니다.
										let replaceLink = () => {											
											let match = message.match(URL_REGEX);
											if (match === TO_DELETE) {
												message = replaceEmoticon(message);
											}
											
											else {
												
												let url = match[0];
												if (url.indexOf(' ') !== -1) {
													url = url.substring(0, url.indexOf(' '));
												}
												
												let index = message.indexOf(url);
												
												message = replaceEmoticon(message.substring(0, index));
												message = message.substring(index + url.length);
												
												children.push(A({
													style : {
														textDecoration : 'underline',
														color : '#3280b9'
													},
													target : '_blank',
													href : url,
													c : url
												}));

												function getSiteName(url) {
													return url.split('/')[2].replace(/w*\.youtube\.com/i, 'Youtube').replace(/youtu\.be/i, 'Youtube');
												}

												global.bus.links.push({
													fileName : getSiteName(url),
													downloadURL : url,
													name : chatData.name,
													userIconURL : chatData.userIconURL,
													userId : chatData.userId,
												});
												global.bus.target.name = 'links';
												global.bus.target.index = global.bus.links.length - 1;
												let cal = CALENDAR(new Date(chatData.createTime));
												global.bus.time = cal.getHour(true) + ':' + cal.getMinute(true) + ':' + cal.getSecond(true);
												global.Collections.fireEvent('bus');
												
												replaceLink();
											}
										};
										
										replaceLink();
									});
									
									// 너무 긴 메시지면 더보기 추가
									if (message !== originMessage) {
										children.push(' ...');
										children.push(A({
											style : {
												textDecoration : 'underline',
												color : '#3280b9'
											},
											c : '[더보기]',
											on : {
												tap : () => {
													Yogurt.Alert({
														style : {
															onDisplayResize : (width) => {
																if (width < 800) {
																	return {
																		width : 300
																	};
																} else if (width < 1200) {
																	return {
																		width : 600
																	};
																} else {
																	return {
																		width : 1000
																	};
																}
															}
														},
														contentStyle : {
															padding : 0
														},
														msg : DIV({
															style : {
																height : 300,
																overflowY : 'scroll',
																fontSize : 14,
																padding : 10,
																lineHeight : '1.4em',
																textAlign : 'left'
															},
															c : originMessage
														})
													});
												}
											}
										}));
									}
									
									return SPAN({
										c : children
									});
								})
							)
						)]
					}));
					
					if (iconMap[chatData.userId] === undefined) {
						iconMap[chatData.userId] = [];
					}
					iconMap[chatData.userId].push(icon);
					
					LoadIcon(chatData.userId, (url) => {
						EACH(iconMap[chatData.userId], (icon) => {
							icon.setSrc(url);
						});
					});
					
					if (chatData.createTime !== undefined) {
						let cal = CALENDAR(new Date(chatData.createTime));
						//message.getEl().title = '작성 시간 ' + cal.getHour(true) + ':' + cal.getMinute(true) + ':' + cal.getSecond(true);
						message.append(SPAN({
							style : {
								opacity : 0,
								fontSize : '.8em',
								color : skinData.backgroundColor,
								fontWeight : 'bold',
								marginRight : '4px',
								position : 'absolute',
								right : 0,
								bottom : '.2em',
								backgroundColor : skinData.lineColor,
								borderRadius : '4px',
								padding : '.25em .5em',
								userSelect : 'none'
							},
							cls : 'time',
							c : cal.getHour(true) + ' : ' + cal.getMinute(true) + ' : ' + cal.getSecond(true)
						}));
					}
				}
				
				// 마지막 메시지를 보고있거나 자기가 쓴 글이라면 스크롤 맨 아래로
				if (isToScrollBottom === true || chatData.userId === user.uid) {
					scrollToEnd();
				}
				
				// 오래된 메시지 삭제
				if (chatDataSet.length > 100) {
					
					if (chatDataSet[0].fileId !== undefined && chatDataSet[0].uploadServer === 'chatUploadApp') {
						chatUploadsRef.child(chatDataSet[0].fileId).delete();
					}
					
					if (chatDataSet[0].fileId !== undefined && chatDataSet[0].uploadServer === 'chatUploadApp2') {
						chatUploads2Ref.child(chatDataSet[0].fileId).delete();
					}
					
					chatsRef.child(chatDataSet[0].key).remove();
					chatDataSet.shift();
				}
			});
			
			// 붙여넣기로 업로드
			EVENT('paste', (e) => {
				EACH(e.getClipboardItems(), (item) => {
					
					if (item.type.indexOf('image') !== -1) {
						
						let file = item.getAsFile();
						
						if (file.size !== undefined && file.size <= MAX_UPLOAD_FILE_SIZE) {
							if (confirm('복사한 이미지 업로드 ㄱㄱ?') === true) {
								uploadFile2(file);
							}
						}
						
						else {
							alert('용량이 너무큼! 최대 용량 ' + INTEGER(MAX_UPLOAD_FILE_SIZE / 1024 / 1024) + 'MB 임');
						}
						
						e.stopDefault();
						
						return false;
					}
				});
			});
			
			// 모바일 제외
			if (INFO.getOSName() !== 'Android' && INFO.getOSName() !== 'iOS') {
				
				// 기본 드래그 앤 드롭 막기
				EVENT('dragover', (e) => {
					e.stop();
				});
				
				// 미리보기 이동
				EVENT('mousemove', (e) => {
					if (preview !== undefined) {
						preview.addStyle({
							left : e.getLeft() + 10,
							top : e.getTop() - preview.getHeight() - 8
						});
					}
				});
				
				// 드래그 앤 드롭으로 업로드
				EVENT('drop', (e) => {
					EACH(e.getFiles(), (file) => {
						
						if (file.size !== undefined && file.size <= MAX_UPLOAD_FILE_SIZE) {
							uploadFile2(file);
						}
						
						else {
							alert('용량이 너무큼! 최대 용량 ' + INTEGER(MAX_UPLOAD_FILE_SIZE / 1024 / 1024) + 'MB 임');
							return false;
						}
					});
					e.stopDefault();
				});
			}
			
			if (isHiding === true) {
				hide();
			}
		};
	}
});